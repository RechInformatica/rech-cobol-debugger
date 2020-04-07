import { DebugInterface } from "./DebugInterface";
import { DebugPosition } from "./DebugPosition";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { SyncProcess } from "./SyncProcess";
import { CobolParagraphBreakpoint } from "../breakpoint/CobolParagraphBreakpoint";
import { CobolMonitor } from "../monitor/CobolMonitor";
import { MonitorCommand } from "./MonitorCommand";
import { UnmonitorCommand } from "./UnmonitorCommand";
import { ListBreakpointsCommand } from "./ListBreakpointsCommand";
import { RemoveBreakpointCommand } from "./RemoveBreakpointCommand";
import { AddBreakpointCommand } from "./AddBreakpointCommand";
import { ChangeVariableValueCommand } from "./ChangeVariableValueCommand";
import { RequestVariableValueCommand } from "./RequestVariableValue";
import { DebugPositionCommand } from "./DebugPositionCommand";
import { ProcessProvider } from "./ProcessProvider";
import * as path from "path";

/**
 * Class to interact with external debugger, sending commands and parsing it's outputs.
 */
export class ExternalDebugAdapter implements DebugInterface {

	/** External COBOL debugger process */
	private debugProcess: SyncProcess;

	constructor(commandLineToStartProcess: string, outputRedirector: (output: string) => void, processProvider?: ProcessProvider) {
		this.debugProcess = new SyncProcess(commandLineToStartProcess, processProvider)
			.withOutputRedirector(outputRedirector)
			.spawn();
	}

	setup(): Promise<DebugPosition> {
		// These regular expressions can only appear at startup, when user
		// does not specify any parameter to external debugger through
		// command-line or specifies an invalid file to start debugging
		return this.sendDebugPositionCommand("", [/Usage\:\s+isdb\s+\[\-opt1/i, /java\.lang\.NoClassDefFoundError/i, /Cannot\s+load\s+class\s+/i]);
	}

	start(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("line");
	}

	stepIn(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("step");
	}

	stepOut(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("outpar");
	}

	stepOutProgram(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("outprog");
	}

	runToNextProgram(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("prog");
	}

	continue(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("continue");
	}

	next(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("next");
	}

	pause(): void {
		this.debugProcess.writeComanndToProcessInput("pause");
	}

	stop(): void {
		this.debugProcess.writeComanndToProcessInput("exit");
	}

	requestVariableValue(args: string): Promise<string | undefined> {
		return new Promise(async (resolve, reject) => {
			if (args.trim().length === 0) {
				return reject("Empty variable name");
			}
			const cmd = new RequestVariableValueCommand();
			this.sendCommand(cmd.buildCommand(args), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

	changeVariableValue(variable: string, newValue: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new ChangeVariableValueCommand();
			const commandLine = cmd.buildCommand({name: variable, value: newValue});
			const regexes = cmd.getExpectedRegExes();
			this.sendCommand(commandLine, regexes).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	addMonitor(monitor: CobolMonitor): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new MonitorCommand();
			this.sendCommand(cmd.buildCommand(monitor), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	removeMonitor(variable: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new UnmonitorCommand();
			this.sendCommand(cmd.buildCommand(variable), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	addBreakpoint(br: CobolBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation({paragraph: `${br.line}`, source: br.source, condition: br.condition});
	}

	addParagraphBreakpoint(br: CobolParagraphBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation(br);
	}

	private addBreakpointOnLocation(br: CobolParagraphBreakpoint): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const cmd = new AddBreakpointCommand();
			this.sendCommand(cmd.buildCommand(br), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

	listBreakpoints(): Promise<CobolBreakpoint[]> {
		return new Promise(async (resolve, reject) => {
			const cmd = new ListBreakpointsCommand();
			this.sendCommand(cmd.buildCommand(), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

	removeBreakpoint(br: CobolBreakpoint): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			const cmd = new RemoveBreakpointCommand();
			this.sendCommand(cmd.buildCommand(br), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

    sendRawCommand(command: string): void {
		this.debugProcess.writeComanndToProcessInput(command);
	}

	/**
	 * Sends a command which will return the new debug position within source code
	 *
	 * @param commandName command to be fired
	 * @param extraFailRegexes extra regular expressions indicating problems from output
	 */
	private sendDebugPositionCommand(commandName: string, extraFailRegexes?: RegExp[]): Promise<DebugPosition> {
		return new Promise(async (resolve, reject) => {
			const cmd = new DebugPositionCommand();
			this.sendCommand(cmd.buildCommand(commandName), cmd.getExpectedRegExes(), extraFailRegexes).then((output) => {
				const position = cmd.validateOutput(output);
				// Checks whether the debugger returned a valid debugging position
				if (position) {
					// If the position already contains file name with directory, we don't
					// need to look for the current directory of the process
					if (position.file.includes("\\") || position.file.includes("/")) {
						//
						// Simply returns the position, since it contains the full path to the file.
						//
						// We don't need to make a second request to the external debugger looking
						// for the current directory
						return resolve(position);
					} else {
						// Makes another request to the external debugger process
						// looking for current directory
						this.requestCurrentDirectory().then((currentDir) => {
							if (currentDir) {
								// The position now contains a full path and VSCode API
								// will properly show the file on editor
								position.file = this.addSeparatorIfNeeded(currentDir.trim()) + position.file;
								return resolve(position);
							} else {
								return reject("Couldn't find full path for " + position.file);
							}
						}).catch((error) => {
							return reject(error);
						});
					}
				} else {
					return reject();
				}
			}).catch((error) => {
				return reject(error);
			});
		});
	}

	/**
	 * Adds a file separator to the specified directory, or returns the
	 * directory itself if already ends with file separator
	 */
	private addSeparatorIfNeeded(directory: string): string {
		if (directory.endsWith("\\") || directory.endsWith("/")) {
			return directory;
		}
		return directory + path.sep;
	}

	/**
	 * Requests the current directory to the external debugger
	 */
	private requestCurrentDirectory(): Promise<string | undefined> {
		return this.requestVariableValue('-env user.dir');
	}

	/**
	 * Sends command to external COBOL debugger expecting an output that matches with the specified regular expressions
	 *
	 * @param command command to be fired
	 * @param expectedRegexes regular expressions to match debugger output
	 */
	private async sendCommand(command: string, expectedRegexes: RegExp[], extraFailRegexes?: RegExp[]): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const failRegexes: RegExp[] = [/exit\s+isdb/i, /Debugger\sis\snot\ssuspended/i, /Exception\s+caught\s+at\s+line/i];
			if (extraFailRegexes) {
				extraFailRegexes.forEach(r => failRegexes.push(r));
			}
			this.debugProcess.sendCommand({
				command: command,
				successRegexes: expectedRegexes,
				success: (output: string) => resolve(output),
				failRegexes: failRegexes,
				fail: (output: string) => reject(output)
			});
		});
	}

}

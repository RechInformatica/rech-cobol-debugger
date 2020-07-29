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
import { AddBreakpointOnFirstLineCommand } from "./AddBreakpointOnFirstLineCommand";
import { UnmonitorAllCommand } from "./UnmonitorAllCommand";
import { DebugConfigsProvider, ICommand } from "./DebugConfigs";

/**
 * Class to interact with external debugger, sending commands and parsing it's outputs.
 */
export class ExternalDebugAdapter implements DebugInterface {

	/** External COBOL debugger process */
	private debugProcess: SyncProcess;

	/** Debug configuration */
	private configs = new DebugConfigsProvider();
	private commands = this.configs.commands;
	private executionFinishedRegularExpressions = this.configs.executionFinishedRegularExpressions;

	constructor(commandLineToStartProcess: string, outputRedirector: (output: string) => void, processProvider?: ProcessProvider) {
		const commandTerminator = this.configs.commandTerminator;
		this.debugProcess = new SyncProcess(commandLineToStartProcess, commandTerminator, processProvider)
			.withOutputRedirector(outputRedirector)
			.spawn();
	}

	start(): Promise<DebugPosition> {
		return new Promise((resolve, reject) => {
			// Calls this command twice because debugger startup may show only filename without path,
			// on the first time this command is called
			this.sendDebugPositionCommand(this.commands.currentLineInfo)
				.then(() => {
					this.sendDebugPositionCommand(this.commands.currentLineInfo)
						.then(position => resolve(position))
						.catch(err => reject(err));
				}).catch(err => reject(err));
		});
	}

	stepIn(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand(this.commands.executeCurrentStatement);
	}

	stepOut(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand(this.commands.stepOutCurrentParagraph);
	}

	stepOutProgram(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand(this.commands.stepOutCurrentProgram);
	}

	runToNextProgram(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand(this.commands.runToNextProgram);
	}

	continue(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand(this.commands.continueProgramExecution);
	}

	next(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand(this.commands.executeCurrentStatementAndBlock);
	}

	pause(): void {
		this.debugProcess.writeComanndToProcessInput(this.commands.suspendProgramExecution.name);
	}

	stop(): void {
		this.debugProcess.writeComanndToProcessInput(this.commands.exitDebug.name);
	}

	requestVariableValue(args: string): Promise<string | undefined> {
		return new Promise((resolve, reject) => {
			if (args.trim().length === 0) {
				return reject("Empty variable name");
			}
			const cmd = new RequestVariableValueCommand(this.commands.requestVariableValue);
			this.sendCommand(cmd.buildCommand(args), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((error) => {
				return reject(error);
			});
		});
	}

	changeVariableValue(variable: string, newValue: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new ChangeVariableValueCommand(this.commands.changeVariableValue);
			const commandLine = cmd.buildCommand({ name: variable, value: newValue });
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
			const cmd = new MonitorCommand(this.commands.addVariableMonitor);
			this.sendCommand(cmd.buildCommand(monitor), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	removeMonitor(variable: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new UnmonitorCommand(this.commands.removeVariableMonitor);
			this.sendCommand(cmd.buildCommand(variable), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	removeAllMonitors(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new UnmonitorAllCommand(this.commands.removeAllVariableMonitors);
			this.sendCommand(cmd.buildCommand(), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((e) => {
				return reject(e);
			})
		});
	}


	addBreakpoint(br: CobolBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation({ paragraph: `${br.line}`, source: br.source, condition: br.condition });
	}

	addParagraphBreakpoint(br: CobolParagraphBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation(br);
	}

	addBreakpointOnFirstLine(program: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new AddBreakpointOnFirstLineCommand(this.commands.addBreakpointOnFirstProgramLine);
			this.sendCommand(cmd.buildCommand(program), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((error) => {
				return reject(error);
			});
		});
	}

	private addBreakpointOnLocation(br: CobolParagraphBreakpoint): Promise<string> {
		return new Promise((resolve, reject) => {
			const cmd = new AddBreakpointCommand(this.commands.addBreakpointOnLocation);
			this.sendCommand(cmd.buildCommand(br), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((error) => {
				return reject(error);
			});
		});
	}

	listBreakpoints(): Promise<CobolBreakpoint[]> {
		return new Promise((resolve, reject) => {
			const cmd = new ListBreakpointsCommand(this.commands.listBreakpoints);
			this.sendCommand(cmd.buildCommand(), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((error) => {
				return reject(error);
			});
		});
	}

	removeBreakpoint(br: CobolBreakpoint): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const cmd = new RemoveBreakpointCommand(this.commands.removeBreakpointFromLocation);
			this.sendCommand(cmd.buildCommand(br), cmd.getExpectedRegExes()).then((output) => {
				return resolve(cmd.validateOutput(output));
			}).catch((error) => {
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
	 * @param command command to be fired
	 */
	private sendDebugPositionCommand(command: ICommand): Promise<DebugPosition> {
		return new Promise((resolve, reject) => {
			const cmd = new DebugPositionCommand(command);
			this.sendCommand(cmd.buildCommand(), cmd.getExpectedRegExes()).then((output) => {
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
	private sendCommand(command: string, expectedRegexes: RegExp[]): Promise<string> {
		return new Promise((resolve, reject) => {
			const failRegexes: RegExp[] = this.createRegExpArray(this.executionFinishedRegularExpressions);
			this.debugProcess.sendCommand({
				command: command,
				successRegexes: expectedRegexes,
				success: (output: string) => resolve(output),
				failRegexes: failRegexes,
				fail: (output: string) => reject(output)
			});
		});
	}

	private createRegExpArray(textRegExp: string[]): RegExp[] {
		const result: RegExp[] = [];
		textRegExp.forEach(current => {
			result.push(new RegExp(current, "i"))
		});
		return result;
	}

}

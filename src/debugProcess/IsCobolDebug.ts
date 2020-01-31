import { DebugInterface } from "./DebugInterface";
import { ChildProcess, exec } from "child_process";
import { DebugPosition } from "./DebugPosition";
import { StepParser } from "../parser/StepParser";
import { VariableParser } from "../parser/VariableParser";
import { CobolBreakpoint } from "./DebugBreakpoint";

/** Delay in milliseconds to wait for debugger setup */
const DELAY_WAIT_DEBUGGER_SETUP = 3000;
/** Delay in milliseconds to wait check for debug output */
const DELAY_WAIT_DEBUG_OUTPUT = 3;
/** Delay in milliseconds to fire again the same command in case of debugger doesn't respond properly */
const DELAY_WAIT_RECURSIVE_COMMAND = 50;
/** Timeout for commands that return the current debug position */
const TIMEOUT_DEBUG_POSITION_COMMAND = 10000;
/** Timeout for commands that return the current debug position */
const TIMEOUT_SEND_COMMAND = 5000;
/** Message indicating that external debugger has finished it's execution */
const DEBUGGER_FINISHED_MESSAGE = "Debugger finished";
/** Max number of attempts to look for debug position information  */
const MAX_DEBUG_POSITION_ATTEMPTS = 5000;
/** Max number of attempts to check if debugger is running */
const MAX_DEBUG_START_ATTEMPTS = 5;
/** Max number of attempts to check if debugger is running */
const MAX_VARIABLE_DISPLAY_ATTEMPTS = 2;
/** Max number of attempts to check if debugger is running */
const MAX_SET_BREAKPOINT_ATTEMPTS = 10;
/** Command used to start debugger execution and check if debugger is running */
const RUN_DEBUGGER_COMMAND = "run";

/**
 * Class to interact with externam isCobol debugger, sending commands and parsing it's outputs.
 */
export class IsCobolDebug implements DebugInterface {

	/** External isCobol debugger process */
	private debugProcess: ChildProcess;
	/** Last debugger response */
	private lastResponse: string = "";
	/** Tells wheter debugger has already started running */
	private startedRunning: boolean;
	/** Tells wheter debugger is ready to receive the next command */
	private readyForNextCommand: boolean;
	/** Command line to starts the debugger process */
	private commantLineToStartsProcess: string;

	constructor(commantLineToStartsProcess: string) {
		this.commantLineToStartsProcess = commantLineToStartsProcess;
		this.startedRunning = false;
		this.readyForNextCommand = true;
		this.debugProcess = this.spawnExternalDebuggerProcess();
		this.setupDebuggerExecution();
	}

	/**
	 * Setups isCobol external debugger
	 */
	private setupDebuggerExecution(): void {
		delay(DELAY_WAIT_DEBUGGER_SETUP).then(() => {
			const runningRegEx = /Debugger\sis\salready\srunning/;
			this.sendRecursiveCommand(0, MAX_DEBUG_START_ATTEMPTS, RUN_DEBUGGER_COMMAND, [runningRegEx]).then(() => {
				this.startedRunning = true;
			}).catch();
		}).catch();
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

	continue(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("continue");
	}

	next(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("next");
	}

	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.sendCommand("exit", [/exit\s+isdb/gi]).then(() => {
				return resolve();
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	requestVariableValue(variable: string): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const command = this.buildDisplayCommand(variable);
			const expectedRegexes = [VariableParser.createVariableValueRegex(variable), this.createVariableNotFoundRegex(variable)];
			this.sendRecursiveCommand(0, MAX_VARIABLE_DISPLAY_ATTEMPTS, command, expectedRegexes).then((result) => {
				return resolve(result)
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

	changeVariableValue(variable: string, newValue: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const command = "let " + variable + "=" + newValue;
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(new RegExp(`new\\s+value\\s+of\\s+${variable}\\s+is\\s+`, "gi"));
			possibleOutputResults.push(new RegExp(`not\\s+a\\s+Cobol\\s+variable\\s+\\'${variable}\\'`, "gi"));
			possibleOutputResults.push(new RegExp(`data-item\\s+not\\s+found\\s+\\'${variable}\\'`, "gi"));
			this.sendCommand(command, possibleOutputResults).then(() => {
				return resolve();
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	addBreakpoint(breakpoint: CobolBreakpoint): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			const command = this.buildAddBreakpointCommand(breakpoint);
			const expectedRegexes = [this.createBreakpointNoVerbRegex(breakpoint), this.createSetedBreakpointRegex(breakpoint)];
			this.sendRecursiveCommand(0, MAX_SET_BREAKPOINT_ATTEMPTS, command, expectedRegexes).then((result) => {
				if (this.createBreakpointNoVerbRegex(breakpoint).test(result)) {
					return resolve(false);
				}
				return resolve(true);
			}).catch(async (error) => {
				return reject(error);
			});
		})
	}

	removeBreakpoint(breakpoint: CobolBreakpoint): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			const command = this.buildRemoveBreakpointCommand(breakpoint);
			const expectedRegexes = [this.createBreakpointNotFoundRegex(breakpoint), this.createBreakpointClearedRegex(breakpoint)];
			this.sendRecursiveCommand(0, MAX_SET_BREAKPOINT_ATTEMPTS, command, expectedRegexes).then((result) => {
				if (this.createBreakpointNotFoundRegex(breakpoint).test(result)) {
					return resolve(false);
				}
				return resolve(true);
			}).catch(async (error) => {
				return reject(error);
			});
		})
	}

	private buildRemoveBreakpointCommand(breakpoint: CobolBreakpoint) {
		const command = `clear ${breakpoint.line} ${breakpoint.source}`
		return command;
	}

	private buildAddBreakpointCommand(breakpoint: CobolBreakpoint): string {
		const command = `break ${breakpoint.line} ${breakpoint.source}`
		return command;
	}

	private createBreakpointClearedRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `clear\\sbreakpoint\\sat\\sline\\s${breakpoint.line}\\,\\sfile\\s${breakpoint.source}`;
		return new RegExp(regexText, "gi");
	}

	private createBreakpointNotFoundRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `not\\sfound\\sbreakpoint\\sat\\sline\\s${breakpoint.line}\\,\\sfile\\s${breakpoint.source}`;
		return new RegExp(regexText, "gi");
	}

	private createBreakpointNoVerbRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `no\\sverb\\sat\\sline\\s${breakpoint.line}\\,\\sfile\\s.*${breakpoint.source}`;
		return new RegExp(regexText, "gi");
	}

	private createSetedBreakpointRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `set\\sbreakpoint\\sat\\sline\\s${breakpoint.line}\\,\\sfile\\s.*${breakpoint.source}`;
		return new RegExp(regexText, "gi");
	}

    /**
	 * Builds the command to display variable value from isCobol debugger
	 *
	 * @param variable variable name
	 */
	private buildDisplayCommand(variable: string): string {
		const command = `display ${variable}`;
		return command;
	}

	/**
	 * Creates a regular expression to parse debugger output and check if variable exists or not
	 *
	 * @param variable variable name
	 */
	private createVariableNotFoundRegex(variable: string): RegExp {
		const regexText = `data-item\\s+not\\s+found\\s+\\'${variable}\\'`;
		return new RegExp(regexText, "gi");
	}

	/**
	 * Sends a command which will return the new debug position within source code
	 *
	 * @param commandName command to be fired
	 */
	private sendDebugPositionCommand(commandName: string): Promise<DebugPosition> {
		return new Promise(async (resolve, reject) => {
			setTimeout(() => {
				return reject('Send position command has timed out after ' + TIMEOUT_DEBUG_POSITION_COMMAND + ' ms - debugger is probably not started');
			}, TIMEOUT_DEBUG_POSITION_COMMAND);
			const fileInformationRegex = /line=(\d+)\s+file=([\w\.:\\/]+)/gi;
			this.sendRecursiveCommand(0, MAX_DEBUG_POSITION_ATTEMPTS, commandName, [fileInformationRegex]).then((response) => {
				const position = new StepParser().parse(response);
				return position ? resolve(position) : reject();
			}).catch((error) => {
				return reject(error);
			})
		});
	}


	/**
	 * Recursively sends the command to external isCobol debugger, parsing output looking for the specified Regular Expressions.
	 *
	 * @param attempt current attempt
	 * @param maxAttempts max number of attempts
	 * @param command command to be fired
	 * @param expectedRegexes expected regular expressions
	 */
	private sendRecursiveCommand(attempt: number, maxAttempts: number, command: string, expectedRegexes: RegExp[]): Promise<string> {
		return new Promise(async (resolve, reject) => {
			if (command != RUN_DEBUGGER_COMMAND) {
				await this.waitUntilDebuggerHasStartedRunning();
			}
			this.sendCommand(command, expectedRegexes).then((response) => {
				return resolve(response);
			}).catch(async (error) => {
				if (error == DEBUGGER_FINISHED_MESSAGE) {
					return reject(error);
				}
				if (attempt <= maxAttempts) {
					await delay(DELAY_WAIT_RECURSIVE_COMMAND);
					this.sendRecursiveCommand(attempt + 1, maxAttempts, command, expectedRegexes).then((response) => {
						return resolve(response);
					}).catch(() => {
						return reject(error);
					})
				} else {
					return reject(error);
				}
			});
		})
	}

	/**
	 * Waits until the debugger has already started, ensuring the commands will take effect on the external process
	 */
	private async waitUntilDebuggerHasStartedRunning(): Promise<void> {
		while (!this.startedRunning) { await delay(DELAY_WAIT_DEBUG_OUTPUT) }
	}

	/**
	 * Creates the external debugger process and configure standard output error output callbacks
	 */
	private spawnExternalDebuggerProcess(): ChildProcess {
		const child = exec(this.commantLineToStartsProcess);
		child.stdout.on('data', (outdata) => {
			this.lastResponse = this.lastResponse + outdata.toString();
			console.log(this.lastResponse);
		});
		child.stderr.on('data', (errdata) => {
			this.lastResponse = this.lastResponse + errdata.toString();
			console.log(errdata.toString());
		});
		return child;
	}

	/**
	 * Sends command to isCobol external debugger expecting for an output that matches with the specified regular expressions
	 *
	 * @param command command to be fired
	 * @param expectedRegexes regular expressions to match debugger output
	 */
	private async sendCommand(command: string, expectedRegexes: RegExp[]): Promise<string> {
		return new Promise(async (resolve, reject) => {
			setTimeout(() => {
				this.readyForNextCommand = true;
				return reject('Command ' + command + ' timed out after ' + TIMEOUT_SEND_COMMAND + ' ms');
			}, TIMEOUT_SEND_COMMAND);
			await this.waitDebuggerReadyAndFireCommand(command);
			this.waitForExpectedOutput(expectedRegexes).then((response) => {
				resolve(response);
			}).catch((error) => {
				reject(error);
			})
		});
	}

	/**
	 * Waits until the debugger is ready and then fires command to external debugger
	 *
	 * @param command command to be fired
	 */
	private async waitDebuggerReadyAndFireCommand(command: string): Promise<void> {
		this.lastResponse = "";
		await this.waitUntilDebuggerIsReady();
		await this.fireWriteCommandToDebugger(command);
	}

	/**
	 * Fires the command to de debugger
	 *
	 * @param command command to be fired
	 */
	private async fireWriteCommandToDebugger(command: string): Promise<void> {
		const fullCommand = command + "\n";
		this.debugProcess.stdin.write(fullCommand);
		console.log(fullCommand);
	}

	/**
	 * Waits until the debugger is ready to receive the next command
	 */
	private async waitUntilDebuggerIsReady(): Promise<void> {
		while (!this.readyForNextCommand) { await delay(DELAY_WAIT_DEBUG_OUTPUT) }
		this.readyForNextCommand = false;
	}

	/**
	 * Waits until debugger outputs the expected message, or outputs an error message
	 *
	 * @param expectedRegexes expected regular expressions
	 */
	private waitForExpectedOutput(expectedRegexes: RegExp[]): Promise<string> {
		return new Promise(async (resolve, reject) => {
			while (!this.isExpectedResponse(this.lastResponse, expectedRegexes)) {
				if (this.isDebuggerFinishied()) {
					this.readyForNextCommand = true;
					return reject(DEBUGGER_FINISHED_MESSAGE);
				}
				if (this.isDebuggerNotSuspended()) {
					this.readyForNextCommand = true;
					return reject("Debugger is not suspended");
				}
				await delay(DELAY_WAIT_DEBUG_OUTPUT)
			}
			this.readyForNextCommand = true;
			return resolve(this.lastResponse);
		});
	}

	/**
	 * Returns true if the external debugger has finished it's execution
	 */
	private isDebuggerFinishied(): boolean {
		return /exit\s+isdb/gi.test(this.lastResponse)
	}

	/**
	 * Returns true if the external debugger is not suspended yet and cannot receive commands for a while
	 */
	private isDebuggerNotSuspended() {
		return /Debugger\sis\snot\ssuspended/gi.test(this.lastResponse)
	}

	/**
	 * Returns true if the debugger response matches with any of the expected regular expressions
	 *
	 * @param response debugger output response
	 * @param expectedRegexex expected regular expressions
	 */
	private isExpectedResponse(response: string, expectedRegexex: RegExp[]): boolean {
		for (let i = 0; i < expectedRegexex.length; i++) {
			const currentRegEx = expectedRegexex[i];
			if (currentRegEx.test(response)) {
				return true;
			}
		}
		return false;
	}

}

/**
 * Function to wait the number of specified milliseconds
 *
 * @param ms number of milliseconds to wait
 */
function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
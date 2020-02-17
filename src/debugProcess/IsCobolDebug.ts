import { DebugInterface } from "./DebugInterface";
import { DebugPosition } from "./DebugPosition";
import { StepParser } from "../parser/StepParser";
import { VariableParser } from "../parser/VariableParser";
import { CobolBreakpoint } from "./DebugBreakpoint";
import { DisplayCommandParser } from "./DisplayCommandParser";
import { SyncProcess } from "./SyncProcess";

/** Delay in milliseconds to wait for debugger setup */
const DELAY_WAIT_DEBUGGER_SETUP = 3000;
/** Command used to start debugger execution and check if debugger is running */
const RUN_DEBUGGER_COMMAND = "run";

/**
 * Class to interact with externam isCobol debugger, sending commands and parsing it's outputs.
 */
export class IsCobolDebug implements DebugInterface {

	/** External isCobol debugger process */
	private debugProcess: SyncProcess;

	constructor(commandLineToStartProcess: string) {
		this.debugProcess = SyncProcess.spawn(commandLineToStartProcess);
	}

	/**
	 * Setups isCobol external debugger
	 */
	public setup(): Promise<DebugPosition> {
		return this.sendDebugPositionCommand("");
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

	/**
	 * Captures variable information considering extra isCobol parameters.
	 * Some of these parameteres are to retrieve value in hexadecimal format or show variable children.
	 *
	 * For example:
	 *       '-x <my-var>' -> shows hexadecimal value
	 *    '-tree <my-var>' -> shows variable with children
	 *
	 * @param args variable with optional isCobol 'display' parameters
	 */
	requestVariableValue(args: string): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const command = `display ${args}`;
			const variable = new DisplayCommandParser().parseArguments(args).variableName;
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(VariableParser.createVariableValueRegex(variable));
			possibleOutputResults.push(this.createVariableNotFoundRegex(variable));
			possibleOutputResults.push(this.createNotVariableOutputRegex(variable));
			possibleOutputResults.push(new RegExp(`Error\\:\\s+subscript\\s+required\\s+\\'${variable}\\'`, "gi"));
			possibleOutputResults.push(/property\s+required/);
			this.sendCommand(command, possibleOutputResults).then((result) => {
				const value = VariableParser.createVariableValueRegex(variable).exec(result);
				if (value && value[1]) {
					return resolve(value[1])
				} else {
					return reject("cant parse " + result);
				}
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
			possibleOutputResults.push(this.createNotVariableOutputRegex(variable));
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
			this.sendCommand(command, expectedRegexes).then((result) => {
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
			this.sendCommand(command, expectedRegexes).then((result) => {
				if (this.createBreakpointNotFoundRegex(breakpoint).test(result)) {
					return resolve(false);
				}
				return resolve(true);
			}).catch(async (error) => {
				return reject(error);
			});
		})
	}

	/**
	 * Creates a Regular Expression to detect isCobol debugger output, indicating that the specified word is not
	 * a Cobol variable
	 *
	 * @param variable variable to consider in Regular Expression
	 */
	private createNotVariableOutputRegex(variable: string): RegExp {
		return new RegExp(`not\\s+a\\s+Cobol\\s+variable\\s+\\'${variable}\\'`, "gi");
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
	 * @param extraArguments extra arguments to isCobol externam debugger
	 */
	private buildDisplayCommand(variable: string, extraArguments?: string): string {
		extraArguments = extraArguments ? extraArguments : "";
		const command = `display ${extraArguments} ${variable}`;
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
			const fileInformationRegex = /line=(\d+)\s+file=([\w\.:\\/]+)/gi;
			this.sendCommand(commandName, [fileInformationRegex]).then((response) => {
				const position = new StepParser().parse(response);
				return position ? resolve(position) : reject();
			}).catch((error) => {
				return reject(error);
			})
		});
	}

	/**
	 * Sends command to isCobol external debugger expecting for an output that matches with the specified regular expressions
	 *
	 * @param command command to be fired
	 * @param expectedRegexes regular expressions to match debugger output
	 */
	private async sendCommand(command: string, expectedRegexes: RegExp[]): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const failRegexes: RegExp[] = [/exit\s+isdb/gi, /Debugger\sis\snot\ssuspended/gi];
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

/**
 * Function to wait the number of specified milliseconds
 *
 * @param ms number of milliseconds to wait
 */
function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

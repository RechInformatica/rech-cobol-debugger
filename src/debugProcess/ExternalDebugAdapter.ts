import { DebugInterface } from "./DebugInterface";
import { DebugPosition } from "./DebugPosition";
import { StepParser } from "../parser/StepParser";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { SyncProcess } from "./SyncProcess";
import { debug } from "vscode";
import { CobolParagraphBreakpoint } from "../breakpoint/CobolParagraphBreakpoint";
import { CobolMonitor } from "../monitor/CobolMonitor";

/** Index where filename can be found on regular expression of breakpoint commands */
const FILENAME_BREAKPOINT_CMD_OUTPUT = 3;
/** Index where filename can be found on regular expression of list command */
const FILENAME_LIST_CMD_OUTPUT = 2;

/**
 * Class to interact with external debugger, sending commands and parsing it's outputs.
 */
export class ExternalDebugAdapter implements DebugInterface {

	/** External COBOL debugger process */
	private debugProcess: SyncProcess;

	constructor(commandLineToStartProcess: string) {
		this.debugProcess = new SyncProcess(commandLineToStartProcess)
			.withOutputRedirector((outData: string) => this.appendOutputToDebugConsole(outData))
			.spawn();
	}

	/**
	 * Appends output data to debug console
	 *
	 * @param outData data to be appended
	 */
	private appendOutputToDebugConsole(outData: string): void {
		const finalText = outData.replace(/isdb>\s+/g, "");
		debug.activeDebugConsole.append(finalText);
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

	requestVariableValue(args: string): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const command = `display ${args}`;
			if (args.trim().length === 0) {
				return reject("Empty variable name");
			}
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(this.createVariableValueRegex());
			possibleOutputResults.push(this.createVariableNotFoundRegex());
			possibleOutputResults.push(this.createNotVariableOutputRegex());
			possibleOutputResults.push(/Error\:\s+subscript\s+required\s+/i);
			possibleOutputResults.push(/Error\:\s+index\s+out\s+of\s+bounds\s+/i);
			possibleOutputResults.push(/property\s+required/i);
			possibleOutputResults.push(/Error:\s+ambiguous\s+identifier/i);
			possibleOutputResults.push(/unexpected\s+error\s+usage/i);
			possibleOutputResults.push(this.createSyntaxErrorRegex());
			this.sendCommand(command, possibleOutputResults).then((result) => {
				const value = this.createVariableValueRegex().exec(result);
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

	changeVariableValue(variable: string, newValue: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const command = "let " + variable + "=" + newValue;
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(this.createNewVariableValueRegex(variable));
			possibleOutputResults.push(this.createNotVariableOutputRegex());
			possibleOutputResults.push(new RegExp(`data-item\\s+not\\s+found\\s+\\'${variable}\\'`, "i"));
			possibleOutputResults.push(/boolean\s+value\s+required\s+\(true\|false\)/i);
			this.sendCommand(command, possibleOutputResults).then((output) => {
				if (this.createNewVariableValueRegex(variable).test(output)) {
					return resolve(true);
				} else {
					return resolve(false);
				}
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	addMonitor(monitor: CobolMonitor): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const command = "monitor -e " + monitor.variable + " when " + monitor.condition;
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(this.createAddMonitorRegex());
			possibleOutputResults.push(this.createVariableNotFoundRegex());
			possibleOutputResults.push(this.createSyntaxErrorRegex());
			possibleOutputResults.push(/unexpected\s+error\s+usage/i);
			this.sendCommand(command, possibleOutputResults).then((output) => {
				if (this.createAddMonitorRegex().test(output)) {
					return resolve(true);
				} else {
					return resolve(false);
				}
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	removeMonitor(variable: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const command = "unmonitor " + variable;
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(this.createClearMonitorRegex());
			possibleOutputResults.push(/not\s+found\s+monitor\s+/i);
			possibleOutputResults.push(/unexpected\s+error\s+usage/i);
			this.sendCommand(command, possibleOutputResults).then((output) => {
				if (this.createClearMonitorRegex().test(output)) {
					return resolve(true);
				} else {
					return resolve(false);
				}
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	addBreakpoint(br: CobolBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation(`${br.line}`, br.source, br.condition);
	}

	addParagraphBreakpoint(br: CobolParagraphBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation(br.paragraph, br.source, br.condition);
	}

	private addBreakpointOnLocation(location: string, source: string, condition?: string): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const command = this.buildAddBreakCommand(location, source, condition);
			const expectedRegexes: RegExp[] = [];
			expectedRegexes.push(this.createNoVerbRegex(source));
			expectedRegexes.push(this.createSetBreakRegex());
			expectedRegexes.push(/no\s+such\s+file/);
			expectedRegexes.push(/no\s+such\s+paragraph/);
			expectedRegexes.push(this.createSyntaxErrorRegex());
			expectedRegexes.push(/unexpected\s+error\s+usage/i);
			this.sendCommand(command, expectedRegexes).then((result) => {
				const regexResult = this.createSetBreakRegex().exec(result);
				if (regexResult) {
					// Returns the breakpoint full filename
					return resolve(regexResult[FILENAME_BREAKPOINT_CMD_OUTPUT]);
				} else {
					return resolve(undefined);
				}
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

	listBreakpoints(): Promise<CobolBreakpoint[]> {
		return new Promise(async (resolve, reject) => {
			const command = "break -l";
			const expectedRegexes = [/\[line(\s|.)*isdb>/mi];
			this.sendCommand(command, expectedRegexes).then((output) => {
				const breaks = this.extractBreaksFromListOutput(output);
				return resolve(breaks);
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

    /**
	 * Parses debugger 'break list' command output and returns an array
	 * of CobolBreakpoint with breakpoint information
	 *
	 * @param output debugger output
	 */
	private extractBreaksFromListOutput(output: string): CobolBreakpoint[] {
		const breaks: CobolBreakpoint[] = [];
		const regex = /\[line:\s+([0-9]+)\,\s+file:\s+([\w\.]+).*\]/gi;
		let result: RegExpExecArray | null = null;
		while ((result = regex.exec(output)) !== null) {
			const line = +result[1];
			const source = result[FILENAME_LIST_CMD_OUTPUT];
			breaks.push({line: line, source: source});
		}
		return breaks;
	}

	removeBreakpoint(br: CobolBreakpoint): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			const command = this.buildRemoveBreakCommand(br);
			const expectedRegexes = [this.createBreakNotFoundRegex(br), this.createBreakClearedRegex(br)];
			this.sendCommand(command, expectedRegexes).then((result) => {
				if (this.createBreakNotFoundRegex(br).test(result)) {
					return resolve(false);
				}
				return resolve(true);
			}).catch(async (error) => {
				return reject(error);
			});
		});
	}

    sendRawCommand(command: string): void {
		this.debugProcess.writeComanndToProcessInput(command);
	}

	/**
	 * Creates a RegEx to parse variable output from external debugger output
	 */
	private createVariableValueRegex(): RegExp {
		return /[\w\(\)\: ]+\s*=[ ](.*)/i;
	}

	/**
	 * Creates a RegEx to parse clear monitor output indicating that the monitor
	 * has been successfully cleared.
	 */
	private createClearMonitorRegex(): RegExp {
		return /clear\s+monitor\s+on/i;
	}

	/**
	 * Crates a regular expression to detect output indicating that value has been correctly changed
	 *
	 * @param variable  variable name
	 */
	private createNewVariableValueRegex(variable: string): RegExp {
		return new RegExp(`new\\s+value\\s+of\\s+${variable}\\s+is\\s+`, "i");
	}

	/**
	 * Creates a Regular Expression to detect COBOL debugger output, indicating that the specified word is not
	 * a Cobol variable
	 */
	private createNotVariableOutputRegex(): RegExp {
		return new RegExp(`not\\s+a\\s+Cobol\\s+variable\\s+`, "i");
	}

	private buildRemoveBreakCommand(breakpoint: CobolBreakpoint) {
		const command = `clear ${breakpoint.line} ${this.addQuotesIfNeeded(breakpoint.source)}`
		return command;
	}

	private buildAddBreakCommand(location: string, source: string, condition?: string): string {
		const command = `break ${location} ${this.addQuotesIfNeeded(source)} ${this.buildConditionIfNeeded(condition)}`;
		return command;
	}

	/**
	 * Add quotes to source name if needed
	 *
	 * @param source source to add quotes
	 */
	private addQuotesIfNeeded(source: string): string {
		if (source.length === 0) {
			return "";
		}
		return `\"${source}\"`;
	}

	/**
	 * Builds the condition clause for the specified breakpoint, if needed.
	 *
	 * @param condition
	 */
	private buildConditionIfNeeded(condition?: string): string {
		if (condition && condition.length > 0) {
			return `when ${condition}`;
		}
		return "";
	}

	/**
	 * Creates and returns a regular expression indicating syntax error
	 */
	private createSyntaxErrorRegex(): RegExp {
		return /syntax\s+error/i;
	}

	private createBreakClearedRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `clear\\sbreakpoint\\sat\\sline\\s${breakpoint.line}\\,\\sfile\\s${breakpoint.source}`;
		return new RegExp(regexText, "i");
	}

	private createBreakNotFoundRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `not\\sfound\\sbreakpoint\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s${breakpoint.source}`;
		return new RegExp(regexText, "i");
	}

	private createNoVerbRegex(source: string): RegExp {
		const regexText = `no\\sverb\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s.*${source}`;
		return new RegExp(regexText, "i");
	}

	private createSetBreakRegex(): RegExp {
		return /set\sbreakpoint\s(at|in)\s(line|paragraph)\s.*\,\sfile\s([\w\.:\\\/ ]+)/i;
	}

	private createAddMonitorRegex(): RegExp {
		return /add\s+monitor\s+on\s+/i;
	}

	/**
	 * Creates a regular expression to parse debugger output and check if variable exists or not
	 */
	private createVariableNotFoundRegex(): RegExp {
		return /data-item\s+not\s+found\s+/i;
	}

	/**
	 * Sends a command which will return the new debug position within source code
	 *
	 * @param commandName command to be fired
	 * @param extraFailRegexes extra regular expressions indicating problems from output
	 */
	private sendDebugPositionCommand(commandName: string, extraFailRegexes?: RegExp[]): Promise<DebugPosition> {
		return new Promise(async (resolve, reject) => {
			const fileInformationRegex = new StepParser().createDebugPositionRegex();
			this.sendCommand(commandName, [fileInformationRegex], extraFailRegexes).then((response) => {
				const position = new StepParser().parse(response);
				return position ? resolve(position) : reject();
			}).catch((error) => {
				return reject(error);
			});
		});
	}

	/**
	 * Sends command to COBOL external debugger expecting for an output that matches with the specified regular expressions
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

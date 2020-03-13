import { DebugInterface } from "./DebugInterface";
import { DebugPosition } from "./DebugPosition";
import { StepParser } from "../parser/StepParser";
import { VariableParser } from "../parser/VariableParser";
import { CobolBreakpoint } from "./CobolBreakpoint";
import { SyncProcess } from "./SyncProcess";
import { debug } from "vscode";
import { CobolParagraphBreakpoint } from "./CobolParagraphBreakpoint";

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

	pause(): void {
		this.debugProcess.writeComanndToProcessInput("pause");
	}

	stop(): void {
		this.debugProcess.writeComanndToProcessInput("exit");
	}

	/**
	 * Captures variable information considering extra COBOL parameters.
	 * Some of these parameteres are to retrieve value in hexadecimal format or show variable children.
	 *
	 * For example:
	 *       '-x <my-var>' -> shows hexadecimal value
	 *    '-tree <my-var>' -> shows variable with children
	 *
	 * @param args variable with optional COBOL 'display' parameters
	 */
	requestVariableValue(args: string): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const command = `display ${args}`;
			const possibleOutputResults: RegExp[] = [];
			possibleOutputResults.push(VariableParser.createVariableValueRegex());
			possibleOutputResults.push(this.createVariableNotFoundRegex());
			possibleOutputResults.push(this.createNotVariableOutputRegex());
			possibleOutputResults.push(new RegExp(`Error\\:\\s+subscript\\s+required\\s+`, "gi"));
			possibleOutputResults.push(/property\s+required/);
			possibleOutputResults.push(/Error:\s+ambiguous\s+identifier/);
			this.sendCommand(command, possibleOutputResults).then((result) => {
				const value = VariableParser.createVariableValueRegex().exec(result);
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
			possibleOutputResults.push(this.createNotVariableOutputRegex());
			possibleOutputResults.push(new RegExp(`data-item\\s+not\\s+found\\s+\\'${variable}\\'`, "gi"));
			this.sendCommand(command, possibleOutputResults).then(() => {
				return resolve();
			}).catch((e) => {
				return reject(e);
			})
		});
	}

	addBreakpoint(br: CobolBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation(`${br.line}`, br.source);
	}

	addParagraphBreakpoint(br: CobolParagraphBreakpoint): Promise<string> {
		return this.addBreakpointOnLocation(br.paragraph, br.source);
	}

	private addBreakpointOnLocation(location: string, source: string): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const command = this.buildAddBreakCommand(location, source);
			const expectedRegexes: RegExp[] = [];
			expectedRegexes.push(this.createNoVerbRegex(source));
			expectedRegexes.push(this.createSetBreakRegex());
			expectedRegexes.push(/no\s+such\s+file/);
			expectedRegexes.push(/no\s+such\s+paragraph/);
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
			const expectedRegexes = [/\[line(\s|.)*isdb>/gmi];
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
	 * Creates a Regular Expression to detect COBOL debugger output, indicating that the specified word is not
	 * a Cobol variable
	 */
	private createNotVariableOutputRegex(): RegExp {
		return new RegExp(`not\\s+a\\s+Cobol\\s+variable\\s+`, "gi");
	}

	private buildRemoveBreakCommand(breakpoint: CobolBreakpoint) {
		const command = `clear ${breakpoint.line} ${breakpoint.source}`
		return command;
	}

	private buildAddBreakCommand(location: string, source: string): string {
		const command = `break ${location} ${source}`
		return command;
	}

	private createBreakClearedRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `clear\\sbreakpoint\\sat\\sline\\s${breakpoint.line}\\,\\sfile\\s${breakpoint.source}`;
		return new RegExp(regexText, "gi");
	}

	private createBreakNotFoundRegex(breakpoint: CobolBreakpoint): RegExp {
		const regexText = `not\\sfound\\sbreakpoint\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s${breakpoint.source}`;
		return new RegExp(regexText, "gi");
	}

	private createNoVerbRegex(source: string): RegExp {
		const regexText = `no\\sverb\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s.*${source}`;
		return new RegExp(regexText, "gi");
	}

	private createSetBreakRegex(): RegExp {
		return /set\sbreakpoint\s(at|in)\s(line|paragraph)\s.*\,\sfile\s([\w:\/\.]+)/gi;
	}

	/**
	 * Creates a regular expression to parse debugger output and check if variable exists or not
	 */
	private createVariableNotFoundRegex(): RegExp {
		const regexText = `data-item\\s+not\\s+found\\s+`;
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
			});
		});
	}

	/**
	 * Sends command to COBOL external debugger expecting for an output that matches with the specified regular expressions
	 *
	 * @param command command to be fired
	 * @param expectedRegexes regular expressions to match debugger output
	 */
	private async sendCommand(command: string, expectedRegexes: RegExp[]): Promise<string> {
		return new Promise(async (resolve, reject) => {
			const failRegexes: RegExp[] = [/exit\s+isdb/gi, /Debugger\sis\snot\ssuspended/gi, /Exception\s+caught\s+at\s+line/gi];
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

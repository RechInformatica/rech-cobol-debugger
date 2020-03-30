import { DebugInterface } from "./debugProcess/DebugInterface";
import { CobolBreakpoint } from "./breakpoint/CobolBreakpoint";
import { CobolParagraphBreakpoint } from "./breakpoint/CobolParagraphBreakpoint";

/** Breakpoint commands for debug console */
const DEBUGGER_BREAK_COMMANDS = ["br"];
/** Program name index within command line to insert breakpoint */
const PROGRAM_NAME_INDEX = 2;
/** Condition index within command line to insert breakpoint */
const CONDITION_INDEX = 1;

/**
 * Class to manage 'repl' (Read–eval–print loop) console commands
 */
export class DebuggerReplManager {

	/** Debugger runtime which will receive commands */
	private debugRuntime: DebugInterface;
	/** Callback to add breakpoint on VSCode debug API */
	private addLineBreakCallback: (bp: CobolBreakpoint) => void;

	/**
	 * Creates a 'repl' debugger manager
	 *
	 * @param debugRuntime debugger runtime which will receive commands
	 */
	constructor(debugRuntime: DebugInterface, addLineBreakCallback: (bp: CobolBreakpoint) => void) {
		this.debugRuntime = debugRuntime;
		this.addLineBreakCallback = addLineBreakCallback;
	}

	/**
	 * Handles the specified command
	 *
	 * @param command
	 */
	public handleCommand(command: string): void {
		if (this.isBreakCommand(command)) {
			if (!this.handleBreakFromCmd(command)) {
				this.debugRuntime.sendRawCommand(command);
			}
		} else {
			this.debugRuntime.sendRawCommand(command);
		}
	}

	/**
	 * Checks if user has typed a breakpoint command on Debug console
	 *
	 * @param command command to check
	 */
	private isBreakCommand(command: string): boolean {
		const splittedCommand = command.toLowerCase().trim().split(/\s+/);
		return DEBUGGER_BREAK_COMMANDS.some(b => splittedCommand[0] === b);
	}

	/**
	 * Handles the breakpoint comand specified through command line
	 *
	 * @param command command line typed by user on Debug Console
	 */
	private handleBreakFromCmd(command: string): boolean {
		const splitted = command.trim().split(/\s+/);
		if (splitted.length > 1) {
			const line = Number(splitted[1]);
			const source = this.extractProgramNameFromCmd(splitted);
			const condition = this.extractConditionFromCmd(command);
			// User typed a paragraph name (not a line number) or did not specify program name
			if (isNaN(line) || !source) {
				// PS.: In this situation we do not have enough information to set breakpoint on
				// VSCode API (lacks line number and/or program name)
				this.addParagraphBreak({ paragraph: splitted[1], source: source, condition: condition});
			} else {
				this.addLineBreakCallback({ line: line, source: source, condition: condition});
			}
			return true;
		}
		return false;
	}

	/**
	 * Extracts the program name from command line or returns empty string
	 * when no program has been specified
	 *
	 * @param splittedCmd command line splitted by spaces
	 */
	private extractProgramNameFromCmd(splittedCmd: string[]): string {
		if (splittedCmd.length <= PROGRAM_NAME_INDEX) {
			return '';
		}
		if (splittedCmd[PROGRAM_NAME_INDEX].toLowerCase() === "when") {
			return ''
		}
		return splittedCmd[PROGRAM_NAME_INDEX];
	}

	/**
	 * Extracts optional breakpoint condition from command line or returns empty string
	 * when no condition has been specified
	 *
	 * @param command command line typed by user
	 */
	private extractConditionFromCmd(command: string): string {
		const regexResult = /when\s+(.*)/i.exec(command);
		if (regexResult && regexResult.length > CONDITION_INDEX) {
			const condition = regexResult[CONDITION_INDEX];
			return condition;
		}
		return "";
	}

	/**
	 * Adds a Cobol Breakpoint on the specified paragraph
	 *
	 * @param bp breakpoint which will be added, with relevant information about Cobol source
	 */
	private addParagraphBreak(bp: CobolParagraphBreakpoint): void {
		this.debugRuntime.addParagraphBreakpoint(bp).then(filename => {
			if (filename) {
				// We need to list existing breakpoints on debugger to find
				// the line where it has been added, since the command typed
				// on Debug Console has only the paragraph name and not the line number
				this.debugRuntime.listBreakpoints().then(breaks => {
					// The breakpoint added moments ago is always the last one
					// in the list, so we can be sure this is the right one
					// to add on UI through VSCode API
					const lastBreak = breaks[breaks.length - 1];
					// The breakpoint on 'list' command does not return the full name,
					// so we need to use the full name returned on addBreakpoint command
					const fullNameBreakpoint: CobolBreakpoint = {line: lastBreak.line, source: filename, condition: bp.condition};
					this.addLineBreakCallback(fullNameBreakpoint);
				}).catch();
			}
		}).catch();
	}

}

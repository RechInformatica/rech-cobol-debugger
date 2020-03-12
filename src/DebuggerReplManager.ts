import { DebugInterface } from "./debugProcess/DebugInterface";
import { CobolBreakpoint } from "./debugProcess/CobolBreakpoint";
import { debug, Uri, Position, Location, SourceBreakpoint } from 'vscode';
import { CobolParagraphBreakpoint } from "./debugProcess/CobolParagraphBreakpoint";

/** Breakpoint commands for debug console */
const DEBUGGER_BREAK_COMMANDS = ["br"];

/**
 * Class to manage 'repl' (Read–eval–print loop) console commands
 */
export class DebuggerReplManager {

	/** Debugger runtime which will receive commands */
	private debugRuntime: DebugInterface;

	/**
	 * Creates a 'repl' debugger manager
	 *
	 * @param debugRuntime debugger runtime which will receive commands
	 */
	constructor(debugRuntime: DebugInterface) {
		this.debugRuntime = debugRuntime;
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
		if (splitted.length > 2) {
			const line = Number(splitted[1]);
			const source = splitted[2];
			// User typed a paragraph name
			if (isNaN(line)) {
				this.addParagraphBreak({ paragraph: splitted[1], source: source});
			} else {
				this.addLineBreak({ line: line, source: source});
			}
			return true;
		}
		return false;
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
					const fullNameBreakpoint: CobolBreakpoint = {line: lastBreak.line, source: filename};
					this.addLineBreak(fullNameBreakpoint);
				}).catch();
			}
		}).catch();
	}

	/**
	 * Adds a Cobol Breakpoint on the specified line.
	 * This method invokes VSCode API so the breakpoint red circle is rendered on UI.
	 *
	 * Besides, this method also invokes 'setBreakPointsRequest' method and updates breakpoint on
	 * BreakpointManager and on external debugger if needed.
	 *
	 * @param bp breakpoint which will be added, with relevant information about Cobol source
	 */
	private addLineBreak(bp: CobolBreakpoint): void {
		const uri = Uri.file(bp.source);
		const pos = new Position(bp.line - 1, 0);
		const loc = new Location(uri, pos);
		const breakpoint = new SourceBreakpoint(loc, true);
		debug.addBreakpoints([breakpoint]);
	}

}

import { DebugInterface } from "./debugProcess/DebugInterface";
import { CobolBreakpoint } from "./debugProcess/DebugBreakpoint";
import { debug, Uri, Position, Location, SourceBreakpoint } from 'vscode';

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
			const cobolBreak = this.extractBreakFromCmd(command);
			if (cobolBreak) {
				const uri = Uri.file(cobolBreak.source);
				const pos = new Position(cobolBreak.line - 1, 0);
				const loc = new Location(uri, pos);
				const breakpoint = new SourceBreakpoint(loc, true);
				debug.addBreakpoints([breakpoint]);
			} else {
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
		return DEBUGGER_BREAK_COMMANDS.some(b => splittedCommand[0].startsWith(b));
	}

	/**
	 * Extracts a CobolBreakpoint from the command specified on current line
	 *
	 * @param command command line typed by user on Debug Console
	 */
	private extractBreakFromCmd(command: string): CobolBreakpoint | undefined {
		const splitted = command.trim().split(/\s+/);
		if (splitted.length > 2) {
			const line = Number(splitted[1]);
			const source = splitted[2];
			if (!isNaN(line)) {
				return {
					line: line,
					source: source,
				}
			}
		}
		return undefined;
	}

}

import { DebugInterface } from "../debugProcess/DebugInterface";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { SetBreakOnLocationReplCommand } from "./SetBreakOnLocationReplCommand";
import { SetBreakOnFirstLineReplCommand } from "./SetBreakOnFirstLineReplCommand";
import { ReplCommand } from "./ReplCommand";

/** Breakpoint commands for debug console */
const DEBUGGER_BREAK_ON_LOCATION = ["br", "break"];
/** Breakpoint commands for debug console */
const DEBUGGER_BREAK_FIRST_LINE = ["b0"];

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
	 */
	constructor(debugRuntime: DebugInterface, addLineBreakCallback: (bp: CobolBreakpoint) => void) {
		this.debugRuntime = debugRuntime;
		this.addLineBreakCallback = addLineBreakCallback;
	}

	/**
	 * Handles the specified command
	 */
	public handleCommand(command: string): void {
		if (this.isCommandOfType(command, DEBUGGER_BREAK_ON_LOCATION)) {
			this.handleCommandImpl(command, new SetBreakOnLocationReplCommand(this.addLineBreakCallback));
		} else {
			if (this.isCommandOfType(command, DEBUGGER_BREAK_FIRST_LINE)) {
				this.handleCommandImpl(command, new SetBreakOnFirstLineReplCommand(this.addLineBreakCallback));
			} else {
				this.debugRuntime.sendRawCommand(command);
			}
		}
	}

	/**
	 * Returns true if and only if the command typed on 'repl' console starts
	 * with any of the commands specified on the array
	 */
	private isCommandOfType(typedCommand: string, possibleCommands: string[]): boolean {
		const splittedCommand = typedCommand.toLowerCase().trim().split(/\s+/);
		return possibleCommands.some(b => splittedCommand[0] === b);
	}

	/**
	 * Handles the specified 'repl' command implementation
	 */
	private handleCommandImpl(command: string, instance: ReplCommand): void {
		instance.fireCommand(this.debugRuntime, command);
	}

}
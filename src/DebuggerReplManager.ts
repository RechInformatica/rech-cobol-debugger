import { DebugInterface } from "./debugProcess/DebugInterface";

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
		this.debugRuntime.sendRawCommand(command);
	}

}
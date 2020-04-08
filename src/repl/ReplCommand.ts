import { DebugInterface } from "../debugProcess/DebugInterface";

/**
 * Interface representing a command on REPL console
 */
export interface ReplCommand {

    /**
	 * Fires the command to external debugger
	 */
	fireCommand(debugRuntime: DebugInterface, command: string): void;

}
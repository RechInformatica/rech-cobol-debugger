import { DebugPosition } from "./DebugPosition";
import { CobolBreakpoint } from "./CobolBreakpoint";
import { CobolParagraphBreakpoint } from "./CobolParagraphBreakpoint";

export interface DebugInterface {

	/**
	 * Setups debugger execution
	 */
	setup(): Promise<DebugPosition>;

	/**
	 * Starts debugger returning the information of it's first line
	 */
	start(): Promise<DebugPosition>;

	/**
	 * Steps into the next sentence
	 */
	stepIn(): Promise<DebugPosition>;

	/**
	 * Steps out of the current context
	 */
	stepOut(): Promise<DebugPosition>;

	/**
	 * Steps out of the current program
	 */
	stepOutProgram(): Promise<DebugPosition>;

	/**
	 * Runs to the next program
	 */
	runToNextProgram(): Promise<DebugPosition>;

	/**
	 * Steps to the next sentence without debugging inside the context
	 */
	next(): Promise<DebugPosition>;

	/**
	 * Pauses debugger execution
	 */
	pause(): void;

	/**
	 * Stops debugger execution
	 */
	stop(): void;

	/**
	 * Continues debugger execution from the current point
	 */
	continue(): Promise<DebugPosition>;

	/**
	 * Requests variable value
	 *
	 * @param variable variable name
	 */
	requestVariableValue(variable: string): Promise<string>;

	/**
	 * Changes variable value
	 *
	 * @param variable variable name
	 * @param newValue new value of the specified variable
	 */
	changeVariableValue(variable: string, newValue: string): Promise<boolean>;

	/**
	 * Adds a Breakpoint
	 *
	 * @param breakpoint breakpoint to set
	 */
	addBreakpoint(breakpoint: CobolBreakpoint): Promise<string | undefined>;

	/**
	 * Adds a Breakpoint on the specified paragraph instead of
	 * specifying a line
	 *
	 * @param breakpoint breakpoint to set
	 */
	addParagraphBreakpoint(breakpoint: CobolParagraphBreakpoint): Promise<string | undefined>;

	/**
	 * Removes an existing breakpoint
	 *
	 * @param breakpoint breakpoint to remove
	 */
	removeBreakpoint(breakpoint: CobolBreakpoint): Promise<boolean>;

	/**
	 * List existing breakpoints
	 */
	listBreakpoints(): Promise<CobolBreakpoint[]>;

	/**
	 * Sends raw command to the external debugger.
	 * This method is tipically used on Debug REPL (Read–eval–print loop) console.
	 *
	 * @param command command to be sent to external debugger
	 */
	sendRawCommand(command: string): void;

}
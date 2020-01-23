import { DebugPosition } from "./DebugPosition";
import { CobolBreakpoint } from "./DebugBreakpoint";

export interface DebugInterface {

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
	 * Steps to the next sentence without debugging inside the context
	 */
	next(): Promise<DebugPosition>;

	/**
	 * Stops debugger execution
	 */
	stop(): Promise<void>;

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
	 * Adds a new Breakpoint
	 *
	 * @param breakpoint breakpoint to set
	 */
	addBreakpoint(breakpoint: CobolBreakpoint): Promise<boolean>;

	/**
	 * Removes an existing breakpoint
	 *
	 * @param breakpoint breakpoint to remove
	 */
	removeBreakpoint(breakpoint: CobolBreakpoint): Promise<boolean>;

}
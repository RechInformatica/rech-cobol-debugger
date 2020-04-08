import { DebugPosition } from "./DebugPosition";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { CobolParagraphBreakpoint } from "../breakpoint/CobolParagraphBreakpoint";
import { CobolMonitor } from "../monitor/CobolMonitor";

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
	 * Captures variable information considering extra COBOL parameters.
	 * Some of these parameteres are to retrieve value in hexadecimal format or show variable children.
	 *
	 * For example:
	 *       '-x <my-var>' -> shows hexadecimal value
	 *    '-tree <my-var>' -> shows variable with children
	 *
	 * @param args variable with optional COBOL 'display' parameters
	 */
	requestVariableValue(variable: string): Promise<string | undefined>;

	/**
	 * Changes variable value
	 *
	 * @param variable variable name
	 * @param newValue new value of the specified variable
	 */
	changeVariableValue(variable: string, newValue: string): Promise<boolean>;

	/**
	 * Adds a monitor to stop debugging when the
	 * specified condicion is met.
	 */
	addMonitor(monitor: CobolMonitor): Promise<boolean>;

	/**
	 * Removes the monitor for the specified variable
	 */
	removeMonitor(variable: string): Promise<boolean>;

	/**
	 * Adds a breakpoint
	 *
	 * @param breakpoint breakpoint to set
	 */
	addBreakpoint(breakpoint: CobolBreakpoint): Promise<string>;

	/**
	 * Adds a breakpoint on the specified paragraph instead of
	 * specifying a line
	 *
	 * @param breakpoint breakpoint to set
	 */
	addParagraphBreakpoint(breakpoint: CobolParagraphBreakpoint): Promise<string>;

	/**
	 * Adds a breakpoint on the first executable line of the specified program
	 *
	 * @param program name of the program where breakpoint will be set
	 */
	addBreakpointOnFirstLine(program: string): Promise<boolean>;

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
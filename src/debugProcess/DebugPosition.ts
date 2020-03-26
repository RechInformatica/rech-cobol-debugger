/**
 * Interface representing the position where debugger is stopped
 */
export interface DebugPosition {
	/** File where next step is going to be processed */
	file: string,
	/** Line number */
	line: number,
	/** Full external debugger output */
	output: string,
}

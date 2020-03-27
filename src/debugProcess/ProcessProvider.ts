/**
 * Interface to provide interaction with external processes
 */
export interface ProcessProvider {

	/**
	 * Starts the external process with the specified command and encoding
	 */
	exec(command: string, encoding: string): void;

	/**
	 * Writes the specified command to process STDIN
	 */
	write(command: string): void;

	/**
	 * Callback executed whenever there is an output on standard output
	 */
	onStdOut(callback: (chunk: string) => void): void;

	/**
	 * Callback executed whenever there is an output on error output
	 */
	onStdErr(callback: (chunk: string) => void): void;

}
/**
 * Interface representing a command on external COBOL debug process
 */
export interface DebugCommand<T, K> {

	/**
	 * Builds the full command which will be sent to external debugger process.
	 *
	 * @param info additional information to build the full command
	 */
	buildCommand(info: T): string;

	/**
	 * Returns an array with all regular expressions which represents valid command outputs.
	 *
	 * These regular expressions will be checked against debugger output to tell
	 * wheter the command has finished or not.
	 *
	 * If at least one of these regular expressions is found on debugger output,
	 * the command will be considered finished.
	 */
	getExpectedRegExes(): RegExp[];

	/**
	 * Validates the debugger output extracting relevant information from this
	 * output.
	 *
	 * The type of information returned depends on each implementation of
	 * this interface.
	 */
	validateOutput(output: string): K;

}

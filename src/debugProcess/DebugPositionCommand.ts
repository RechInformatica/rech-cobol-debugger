import { DebugCommand } from "./DebugCommand";
import { DebugPosition } from "./DebugPosition";

/** Index inside match where the line number can be extracted */
const MATCH_LINE_INDEX = 1;
/** Index inside match where the file name can be extracted */
const MATCH_FILE_INDEX = 2;

/**
 * Class to handle several commands which return a debug position
 */
export class DebugPositionCommand implements DebugCommand<string, DebugPosition | undefined> {

	buildCommand(commandLine: string): string {
		// returns the command itself because this class is used for several commands
		return commandLine;
	}

	getExpectedRegExes(): RegExp[] {
		return [this.createDebugPositionRegex()];
	}

	validateOutput(output: string): DebugPosition | undefined {
		const match = this.createDebugPositionRegex().exec(output);
		if (match && match.length > MATCH_FILE_INDEX) {
			return ({
				file: match[MATCH_FILE_INDEX],
				line: new Number(match[MATCH_LINE_INDEX]).valueOf(),
				output: output
			});
		}
		return undefined;
	}

	/**
	 * Creates a regular expression to extract debug position from debugger output
	 */
	private createDebugPositionRegex(): RegExp {
		return /^\+*\s+line=(\d+)\s+file=([\w\.:\\\/ \-]+)/im;
	}

}

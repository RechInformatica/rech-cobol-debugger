import { DebugPosition } from "../debugProcess/DebugPosition";

/** Index inside match where the line number can be extracted */
const MATCH_LINE_INDEX = 1;
/** Index inside match where the file name can be extracted */
const MATCH_FILE_INDEX = 2;

/**
 * Class to parse Step output from COBOL command-line debugger process
 */
export class StepParser {

	public parse(output: string): DebugPosition | undefined {
		const match = /line=(\d+)\s+file=([\w\.:\\/\-]+)/gi.exec(output);
		if (match && match.length > MATCH_FILE_INDEX) {
			return ({
				file: match[MATCH_FILE_INDEX],
				line: new Number(match[MATCH_LINE_INDEX]).valueOf(),
				output: output
			});
		}
		return undefined;
	}

}
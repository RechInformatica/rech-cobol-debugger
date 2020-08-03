import { DebugCommand } from "./DebugCommand";
import { DebugPosition } from "./DebugPosition";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/** Index inside match where the line number can be extracted */
const MATCH_LINE_INDEX = 1;
/** Index inside match where the file name can be extracted */
const MATCH_FILE_INDEX = 2;

/**
 * Class to handle several commands which return a debug position
 */
export class DebugPositionCommand implements DebugCommand<void, DebugPosition | undefined> {

	constructor(private command: ICommand) { }

	buildCommand(): string {
		// returns the command itself because this class is used for several commands
		return this.command.name;
	}

	getExpectedRegExes(): RegExp[] {
		const result = new GenericDebugCommand(this.command).getExpectedRegExes("im");
		return result;
	}

	validateOutput(output: string): DebugPosition | undefined {
		const successRegExp = this.command.successRegularExpression;
		const match = successRegExp ? new RegExp(successRegExp, "im").exec(output) : undefined;
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

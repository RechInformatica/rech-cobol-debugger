import { DebugCommand } from "./DebugCommand";
import { DebugPosition } from "./DebugPosition";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";
import { PATH_NAMED_GROUP, LINE_NAMED_GROUP } from "./PositionConstants";

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
		if (match && match.groups) {
			const groups = match.groups;
			const file = groups[PATH_NAMED_GROUP];
			const line = groups[LINE_NAMED_GROUP];
			if (file && line) {
				return ({
					file: file,
					line: new Number(line).valueOf(),
					output: output
				});
			}
		}
		return undefined;
	}

}

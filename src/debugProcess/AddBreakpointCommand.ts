import { DebugCommand } from "./DebugCommand";
import { CobolParagraphBreakpoint } from "../breakpoint/CobolParagraphBreakpoint";
import { CommandUtils } from "./CommandUtils";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";
import { PATH_NAMED_GROUP } from "./PositionConstants";

/**
 * Class to handle command to add breakpoint
 */
export class AddBreakpointCommand implements DebugCommand<CobolParagraphBreakpoint, string | undefined> {

	constructor(private command: ICommand) { }

	buildCommand(br: CobolParagraphBreakpoint): string {
		const command = `${this.command.name} ${br.paragraph} ${CommandUtils.addQuotesIfNeeded(br.source)} ${this.buildConditionIfNeeded(br.condition)}`;
		return command;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): string | undefined {
		if (!this.command.successRegularExpression) {
			return undefined;
		}
		const regexResult = new RegExp(this.command.successRegularExpression, "i").exec(output);
		if (regexResult && regexResult.groups) {
			// Returns the breakpoint full filename
			const groups = regexResult.groups;
			const filePath = groups[PATH_NAMED_GROUP];
			return filePath;
		}
		return undefined;
	}

	/**
	 * Builds the condition clause for the specified breakpoint, if needed.
	 */
	private buildConditionIfNeeded(condition?: string): string {
		if (condition && condition.length > 0) {
			return `when ${condition}`;
		}
		return "";
	}

}

import { DebugCommand } from "./DebugCommand";
import { CobolParagraphBreakpoint } from "../breakpoint/CobolParagraphBreakpoint";
import { CommandUtils } from "./CommandUtils";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/** Index where filename can be found on regular expression of breakpoint commands */
const FILENAME_BREAKPOINT_CMD_OUTPUT = 3;

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
		if (regexResult) {
			// Returns the breakpoint full filename
			return regexResult[FILENAME_BREAKPOINT_CMD_OUTPUT];
		} else {
			return undefined;
		}
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

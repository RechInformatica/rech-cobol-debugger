import { DebugCommand } from "./DebugCommand";
import { CobolParagraphBreakpoint } from "../breakpoint/CobolParagraphBreakpoint";
import { CommandUtils } from "./CommandUtils";

/** Index where filename can be found on regular expression of breakpoint commands */
const FILENAME_BREAKPOINT_CMD_OUTPUT = 3;

/**
 * Class to handle command to add breakpoint
 */
export class AddBreakpointCommand implements DebugCommand<CobolParagraphBreakpoint, string | undefined> {

	/**
	 * Current breakpoint being handled
	 */
	private break: CobolParagraphBreakpoint | undefined;

	buildCommand(br: CobolParagraphBreakpoint): string {
		const command = `break ${br.paragraph} ${CommandUtils.addQuotesIfNeeded(br.source)} ${this.buildConditionIfNeeded(br.condition)}`;
		this.break = br;
		return command;
	}

	getExpectedRegExes(): RegExp[] {
		const expectedRegexes: RegExp[] = [];
		expectedRegexes.push(this.createNoVerbRegex(this.break!.source));
		expectedRegexes.push(this.createSetBreakRegex());
		expectedRegexes.push(/no\s+such\s+file/);
		expectedRegexes.push(/no\s+such\s+paragraph/);
		expectedRegexes.push(CommandUtils.createSyntaxErrorRegex());
		expectedRegexes.push(/unexpected\s+error\s+usage/i);
		return expectedRegexes;
	}

	validateOutput(output: string): string | undefined {
		const regexResult = this.createSetBreakRegex().exec(output);
		if (regexResult) {
			// Returns the breakpoint full filename
			return regexResult[FILENAME_BREAKPOINT_CMD_OUTPUT];
		} else {
			return undefined;
		}
	}

	/**
	 * Creates a regular expression indicating that no ver was found on the specified location.
	 *
	 * Tipically represents that it's not a valid location to add a breakpoint,
	 * like a comment line
	 */
	private createNoVerbRegex(source: string): RegExp {
		const regexText = `no\\sverb\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s.*${source}`;
		return new RegExp(regexText, "i");
	}

	/**
	 * Creates a regular expression indicating that the breapoint could be successfully set
	 */
	private createSetBreakRegex(): RegExp {
		return /set\sbreakpoint\s(at|in)\s(line|paragraph)\s.*\,\sfile\s([\w\.:\\\/ ]+)/i;
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

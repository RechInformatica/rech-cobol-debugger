import { DebugCommand } from "./DebugCommand";
import { CommandUtils } from "./CommandUtils";

/**
 * Class to handle command to add breakpoint on the first line of the specified program
 */
export class AddBreakpointOnFirstLineCommand implements DebugCommand<string, boolean> {

	buildCommand(program: string): string {
		// We can't add quotes to source filename because external debugger
		// unfortunately might not recognize the quotes on this 'b0' command
		return `b0 ${program}`;
	}

	getExpectedRegExes(): RegExp[] {
		const expectedRegexes: RegExp[] = [];
		expectedRegexes.push(this.createSetBreakRegex());
		expectedRegexes.push(/no\s+such\s+program/);
		expectedRegexes.push(CommandUtils.createSyntaxErrorRegex());
		expectedRegexes.push(/unexpected\s+error\s+usage/i);
		return expectedRegexes;
	}

	validateOutput(output: string): boolean {
		return this.createSetBreakRegex().test(output);
	}

	/**
	 * Creates a regular expression indicating that the breapoint could be successfully set
	 */
	private createSetBreakRegex(): RegExp {
		return /set\s+breakpoint\s+at\s+the\s+first\s+line\s+of\s+program/i;
	}

}

import { DebugCommand } from "./DebugCommand";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { CommandUtils } from "./CommandUtils";

/**
 * Class to handle command to remove breakpoint
 */
export class RemoveBreakpointCommand implements DebugCommand<CobolBreakpoint, boolean> {

	/** Breakpoint being currently handle */
	private break: CobolBreakpoint | undefined;

	buildCommand(b: CobolBreakpoint): string {
		const command = `clear ${b.line} ${CommandUtils.addQuotesIfNeeded(b.source)}`
		this.break = b;
		return command;
	}

	getExpectedRegExes(): RegExp[] {
		return [this.createBreakNotFoundRegex(this.break!), this.createBreakClearedRegex(this.break!)];
	}

	validateOutput(output: string): boolean {
		return this.createBreakClearedRegex(this.break!).test(output);
	}

	/**
	 * Creates a regular expression to detect wheter the breakpoint could not be found
	 */
	private createBreakNotFoundRegex(br: CobolBreakpoint): RegExp {
		const regexText = `not\\sfound\\sbreakpoint\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s${br.source}`;
		return new RegExp(regexText, "i");
	}

	/**
	 * Creates a regular expression to detect wheter the breakpoint could be cleared
	 */
	private createBreakClearedRegex(br: CobolBreakpoint): RegExp {
		const regexText = `clear\\sbreakpoint\\sat\\sline\\s${br.line}\\,\\sfile\\s${br.source}`;
		return new RegExp(regexText, "i");
	}


}
import { DebugCommand } from "./DebugCommand";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";
import { PATH_NAMED_GROUP, LINE_NAMED_GROUP } from "./PositionConstants";

/**
 * Class to handle list breakpoints command
 */
export class ListBreakpointsCommand implements DebugCommand<void, CobolBreakpoint[]> {

	constructor(private command: ICommand) { }

	buildCommand(): string {
		return this.command.name;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): CobolBreakpoint[] {
		return this.extractBreaksFromListOutput(output);
	}

	/**
	 * Parses debugger 'break list' command output and returns an array
	 * of CobolBreakpoint with breakpoint information
	 *
	 * @param output debugger output
	 */
	private extractBreaksFromListOutput(output: string): CobolBreakpoint[] {
		const breaks: CobolBreakpoint[] = [];
		const successRegExp = this.command.successRegularExpression;
		const regex = successRegExp ? new RegExp(successRegExp, "gi") : undefined;
		if (regex) {
			let result: RegExpExecArray | null = null;
			while ((result = regex.exec(output)) !== null) {
				const groups = result.groups;
				if (groups) {
					const file = groups[PATH_NAMED_GROUP];
					const line = groups[LINE_NAMED_GROUP];
					breaks.push({
						line: new Number(line).valueOf(),
						source: file
					});
				}
			}
		}
		return breaks;
	}

}

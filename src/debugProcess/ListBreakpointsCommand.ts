import { DebugCommand } from "./DebugCommand";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/** Index where filename can be found on regular expression of list command */
const FILENAME_LIST_CMD_OUTPUT = 2;

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
				const line = +result[1];
				const source = result[FILENAME_LIST_CMD_OUTPUT];
				breaks.push({ line: line, source: source });
			}
		}
		return breaks;
	}

}

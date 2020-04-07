import { DebugCommand } from "./DebugCommand";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";

/** Index where filename can be found on regular expression of list command */
const FILENAME_LIST_CMD_OUTPUT = 2;

/**
 * Class to handle list breakpoints command
 */
export class ListBreakpointsCommand implements DebugCommand<void, CobolBreakpoint[]> {

	buildCommand(): string {
		return "break -l";
	}

	getExpectedRegExes(): RegExp[] {
		return [/\[line(\s|.)*isdb>/mi];
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
		const regex = /\[line:\s+([0-9]+)\,\s+file:\s+([\w\.]+).*\]/gi;
		let result: RegExpExecArray | null = null;
		while ((result = regex.exec(output)) !== null) {
			const line = +result[1];
			const source = result[FILENAME_LIST_CMD_OUTPUT];
			breaks.push({line: line, source: source});
		}
		return breaks;
	}

}

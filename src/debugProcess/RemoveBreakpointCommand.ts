import { DebugCommand } from "./DebugCommand";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";
import { CommandUtils } from "./CommandUtils";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle command to remove breakpoint
 */
export class RemoveBreakpointCommand implements DebugCommand<CobolBreakpoint, boolean> {

	constructor(private command: ICommand) {}

	buildCommand(b: CobolBreakpoint): string {
		const command = `${this.command.name} ${b.line} ${CommandUtils.addQuotesIfNeeded(b.source)}`
		return command;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): boolean {
		return new GenericDebugCommand(this.command).validateOutput(output);
	}

}

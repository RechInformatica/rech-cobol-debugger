import { DebugCommand } from "./DebugCommand";
import { CommandUtils } from "./CommandUtils";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle command to add breakpoint on the first line of the specified program
 */
export class AddBreakpointOnFirstLineCommand implements DebugCommand<string, boolean> {

	constructor(private command: ICommand) { }

	buildCommand(program: string): string {
		// We can't add quotes to source filename because external debugger
		// unfortunately might not recognize the quotes on this command
		return `${this.command.name} ${program}`;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): boolean {
		return new GenericDebugCommand(this.command).validateOutput(output);
	}

}

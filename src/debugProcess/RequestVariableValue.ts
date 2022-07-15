import { DebugCommand } from "./DebugCommand";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle command to request variable value
 */
export class RequestVariableValueCommand implements DebugCommand<string, string | undefined> {

	constructor(private command: ICommand) { }

	buildCommand(variable: string): string {
		return `${this.command.name} ${variable}`;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): string | undefined {
		const successRegExp = this.command.successRegularExpression;
		const value = successRegExp ? new RegExp(successRegExp, "i").exec(output) : undefined;
		if (value && value[1]) {
			return value[1];
		} else {
			return undefined;
		}
	}

}

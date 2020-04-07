import { DebugCommand } from "./DebugCommand";
import { CommandUtils } from "./CommandUtils";

/**
 * Class to handle command to request variable value
 */
export class RequestVariableValueCommand implements DebugCommand<string, string | undefined> {

	buildCommand(variable: string): string {
		return `display ${variable}`;
	}

	getExpectedRegExes(): RegExp[] {
		const regexes: RegExp[] = [];
		regexes.push(this.createVariableValueRegex());
		regexes.push(this.createVariableNotFoundRegex());
		regexes.push(CommandUtils.createNotVariableOutputRegex());
		regexes.push(/Error\:\s+subscript\s+required\s+/i);
		regexes.push(/Error\:\s+index\s+out\s+of\s+bounds\s+/i);
		regexes.push(/property\s+required/i);
		regexes.push(/Error:\s+ambiguous\s+identifier/i);
		regexes.push(/unexpected\s+error\s+usage/i);
		regexes.push(CommandUtils.createSyntaxErrorRegex());
		return regexes;
	}

	validateOutput(output: string): string | undefined {
		const value = this.createVariableValueRegex().exec(output);
		if (value && value[1]) {
			return value[1];
		} else {
			return undefined;
		}
	}

	/**
	 * Creates a RegEx to parse variable output from external debugger output
	 */
	private createVariableValueRegex(): RegExp {
		return /[\w\(\)\: ]+\s*=[ ](.*)/i;
	}


	/**
	 * Creates a regular expression to parse debugger output and check if variable exists or not
	 */
	private createVariableNotFoundRegex(): RegExp {
		return /data-item\s+not\s+found\s+/i;
	}

}

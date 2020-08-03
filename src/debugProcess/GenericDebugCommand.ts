import { DebugCommand } from "./DebugCommand";
import { ICommand } from "./DebugConfigs";

export class GenericDebugCommand implements DebugCommand<string, boolean> {

	constructor(private command: ICommand) { }

	buildCommand(): string {
		return this.command.name;
	}

	getExpectedRegExes(regExpFlags?: string): RegExp[] {
		const result: RegExp[] = [];
		const flags = this.getFlagsOrDefault(regExpFlags);
		if (this.command.successRegularExpression) {
			result.push(new RegExp(this.command.successRegularExpression, flags));
		}
		if (this.command.extraRegularExpressions) {
			this.command.extraRegularExpressions.forEach(stringRegExp => {
				result.push(new RegExp(stringRegExp, flags));
			});
		}
		return result;
	}

	validateOutput(output: string, regExpFlags?: string): boolean {
		if (!this.command.successRegularExpression) {
			return false;
		}
		const flags = this.getFlagsOrDefault(regExpFlags);
		const regExp = new RegExp(this.command.successRegularExpression, flags);
		const result = regExp.test(output);
		return result;
	}

	private getFlagsOrDefault(regExpFlags?: string): string {
		const flags = regExpFlags ? regExpFlags : "i";
		return flags;
	}

}

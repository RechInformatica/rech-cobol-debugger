import { DebugCommand } from "./DebugCommand";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/** Named group where the file name can be extracted */
export const AVAILABLE_DIRECTORIES_NAMED_GROUP = 'directories';

/**
 * Class to handle command to request available source directories
 */
export class RequestAvailableSourceDirectoriesCommand implements DebugCommand<void, string[] | undefined> {

	constructor(private command: ICommand) {}

	buildCommand(): string {
		return new GenericDebugCommand(this.command).buildCommand();
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): string[] | undefined {
		const successRegExp = this.command.successRegularExpression;
		const match = successRegExp ? new RegExp(successRegExp, "im").exec(output) : undefined;
		if (match && match.groups) {
			const groups = match.groups;
			const directories = groups[AVAILABLE_DIRECTORIES_NAMED_GROUP];
			const splitted = directories.split(';');
			return splitted;
		}
	}

}

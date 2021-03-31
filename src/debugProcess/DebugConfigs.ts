import * as fs from "fs";
import * as path from "path";

/**
 * Class to provide command names and regular expressions to interact
 * with external debug process.
 *
 * By default, this class loads information from defaultDebugConfigs.json which
 * is distributed with the project, or loads the .json file path from settings.
 */
export class DebugConfigsProvider {

	private _configs: IDebugConfigs;

	constructor(externalConfigPath?: string) {
		const configPath = externalConfigPath ? externalConfigPath : this.buildDefaultConfigsFileName();
		this._configs = this.loadConfigs(configPath);
	}

	get commands(): IDebugCommands {
		return this._configs.commands;
	}

	get executionFinishedRegularExpressions(): string[] {
		return this._configs.executionFinishedRegularExpressions;
	}

	get retriesRegularExpressions(): string[] | undefined {
		return this._configs.retriesRegularExpressions;
	}

	get commandTerminator(): string {
		return this._configs.commandTerminator;
	}

	private loadConfigs(filePath: string): IDebugConfigs {
		const configs = JSON.parse(readFile(filePath));
		return configs;
	}

	private buildDefaultConfigsFileName(): string {
		return path.join(__dirname, "..", "..", "defaultDebugConfigs.json");
	}

}

function readFile(fileName: string): string {
	const fileContent = fs.readFileSync(fileName, { encoding: "UTF-8" });
	return fileContent;
}

export interface IDebugConfigs {

	commands: IDebugCommands,
	executionFinishedRegularExpressions: string[],
	retriesRegularExpressions?: string[],
	commandTerminator: string,

}

export interface IDebugCommands {
	currentLineInfo: ICommand
	executeCurrentStatement: ICommand
	stepOutCurrentParagraph: ICommand
	stepOutCurrentProgram: ICommand
	runToNextProgram: ICommand
	continueProgramExecution: ICommand
	executeCurrentStatementAndBlock: ICommand
	suspendProgramExecution: ICommand
	exitDebug: ICommand
	addBreakpointOnFirstProgramLine: ICommand
	addBreakpointOnLocation: ICommand
	removeBreakpointFromLocation: ICommand
	listBreakpoints: ICommand
	requestVariableValue: ICommand
	changeVariableValue: ICommand
	addVariableMonitor: ICommand
	removeVariableMonitor: ICommand
	removeAllVariableMonitors: ICommand
	requestAvailableSourceDirectories?: ICommand
}

export interface ICommand {

	name: string,
	successRegularExpression?: string,
	extraRegularExpressions?: string[]

}

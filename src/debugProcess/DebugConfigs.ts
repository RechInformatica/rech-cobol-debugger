import * as fs from "fs";
import * as path from "path";

export class DebugConfigsProvider {

	private _configs: IDebugConfigs = this.loadConfigs();

	get commands(): IDebugCommands {
		return this._configs.commands;
	}

	get executionFinishedRegularExpressions(): string[] {
		return this._configs.executionFinishedRegularExpressions;
	}

	get commandTerminator(): string {
		return this._configs.commandTerminator;
	}

	private loadConfigs(): IDebugConfigs {
		const fileName = this.buildConfigsFileName();
		const configs = JSON.parse(readFile(fileName));
		return configs;
	}

	private buildConfigsFileName(): string {
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
}

export interface ICommand {

	name: string,
	successRegularExpression?: string,
	extraRegularExpressions?: string[]

}

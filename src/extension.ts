'use strict';

import { ExtensionContext, commands, window, debug, DebugAdapterDescriptorFactory, languages, TextDocument, Position, ProviderResult, EvaluatableExpression, Range } from 'vscode';
import { CobolConfigurationProvider } from './CobolConfigurationProvider';
import { CobolDebugAdapterDescriptorFactory } from './CobolDebugAdapterDescriptorFactory';
import { Configuration } from './helper/Configuration';
import { CobolEvaluatableExpressionProvider } from './debugProcess/CobolEvaluatableExpressionProvider';
import { CUSTOM_COMMAND_STEP_OUT_PROGRAM, CUSTOM_COMMAND_RUN_TO_NEXT_PROGRAM } from './CobolDebug';

/** Default selections of input boxes typed by user */
const DEFAULT_SELECTIONS: Map<string, string> = new Map<string, string>();

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.startDebugger', () => {
		return askAllParameters();
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.stepOutProgram', () => {
		if (debug.activeDebugSession) {
			debug.activeDebugSession.customRequest(CUSTOM_COMMAND_STEP_OUT_PROGRAM);
		}
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.runToNextProgram', () => {
		if (debug.activeDebugSession) {
			debug.activeDebugSession.customRequest(CUSTOM_COMMAND_RUN_TO_NEXT_PROGRAM);
		}
	}));



	// register a configuration provider for 'COBOL' debug type
	const provider = new CobolConfigurationProvider();
	context.subscriptions.push(debug.registerDebugConfigurationProvider('COBOL', provider));

	// register an adapter factory for 'COBOL' debug type
	const factory: DebugAdapterDescriptorFactory = new CobolDebugAdapterDescriptorFactory();
	context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('COBOL', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}

	// override VS Code's default implementation of the debug hover
	languages.registerEvaluatableExpressionProvider('COBOL', new CobolEvaluatableExpressionProvider());

}

function askAllParameters(): Promise<string> {
	return new Promise<string>(async (resolve) => {
		const configuration = new Configuration("rech.cobol.debug")
		const questions = configuration.get<string[]>("params");
		let commandLine = configuration.get<string>("commandline");
		for (let i = 0; i < questions.length; i++) {
			const question = questions[i];
			const defaultValue = DEFAULT_SELECTIONS.get(question);
			const token = `$${i + 1}`;
			let response = await askParameter(question, defaultValue);
			if (!response) {
				response = "";
			}
			DEFAULT_SELECTIONS.set(question, response);
			commandLine = commandLine.replace(token, response);
		}
		commandLine = commandLine.trim();
		return resolve(commandLine);
	});
}

function askParameter(question: string, defaultValue: string | undefined): Thenable<string | undefined> {
	return new Promise((resolve, reject) => {
		window.showInputBox({ value: defaultValue, prompt: question, ignoreFocusOut: true }).then((response) => {
			resolve(response);
		}, (e) => reject(e));
	});
}

export function deactivate() {
	// nothing to do
}

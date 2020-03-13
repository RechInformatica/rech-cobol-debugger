'use strict';

import { ExtensionContext, commands, window, debug, DebugAdapterDescriptorFactory, languages, TextDocument, Position, ProviderResult, EvaluatableExpression, Range } from 'vscode';
import { CobolConfigurationProvider } from './CobolConfigurationProvider';
import { CobolDebugAdapterDescriptorFactory } from './CobolDebugAdapterDescriptorFactory';
import { Configuration } from './helper/Configuration';
import { CobolEvaluatableExpressionProvider } from './debugProcess/CobolEvaluatableExpressionProvider';

/** Default selections of input boxes typed by user */
const DEFAULT_SELECTIONS: Map<string, string> = new Map<string, string>();

export function activate(context: ExtensionContext) {

	const configuration = new Configuration("rech.cobol.debug")

	context.subscriptions.push(commands.registerCommand('extension.cobol-debug.startDebugger', _config => {
		return new Promise<string>(async (resolve) => {
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

function askParameter(question: string, defaultValue: string | undefined): Thenable<string | undefined> {
	return new Promise((resolve, reject) => {
		window.showInputBox({value: defaultValue, prompt: question, ignoreFocusOut: true}).then((response) => {
			resolve(response);
		}, (e) => reject(e));
	});
}

export function deactivate() {
	// nothing to do
}

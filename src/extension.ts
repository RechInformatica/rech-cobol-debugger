'use strict';

import { ExtensionContext, commands, window, debug, DebugAdapterDescriptorFactory } from 'vscode';
import { CobolConfigurationProvider } from './CobolConfigurationProvider';
import { CobolDebugAdapterDescriptorFactory } from './CobolDebugAdapterDescriptorFactory';
import { Configuration } from './helper/Configuration';
import Q from 'q';

export function activate(context: ExtensionContext) {

	const configuration = new Configuration("rech.iscobol.debug")

	context.subscriptions.push(commands.registerCommand('extension.cobol-debug.startDebugger', _config => {
		return new Promise<string>(async (resolve) => {
			const questions = configuration.get<string[]>("params");
			let commandLine = configuration.get<string>("commandline");
			for (let i = 0; i < questions.length; i++) {
				const question = questions[i];
				const response = await askParameter(question);
				if (response) {
					const token = `$${i + 1}`;
					commandLine = commandLine.replace(token, response!);
				}

			}
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
}

function askParameter(question: string): Thenable<string | undefined> {
	return new Promise((resolve, reject) => {
		window.showInputBox({placeHolder: question, ignoreFocusOut: true}).then((response) => {
			resolve(response);
		}, (e) => reject(e));
	});
}

export function deactivate() {
	// nothing to do
}

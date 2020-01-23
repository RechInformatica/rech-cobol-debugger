'use strict';

import { ExtensionContext, commands, window, debug, DebugAdapterDescriptorFactory } from 'vscode';
import { CobolConfigurationProvider } from './CobolConfigurationProvider';
import { CobolDebugAdapterDescriptorFactory } from './CobolDebugAdapterDescriptorFactory';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('extension.cobol-debug.getProgramName', _config => {
		return new Promise<string>((resolve) => {
			resolve("TUFUNFIL.CBL");
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

export function deactivate() {
	// nothing to do
}

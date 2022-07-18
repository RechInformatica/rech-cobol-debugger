import { DebugConfigurationProvider, window, WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from "vscode";

export class CobolConfigurationProvider implements DebugConfigurationProvider {

	/**
	 * Message a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(_folder: WorkspaceFolder | undefined, config: DebugConfiguration, _token?: CancellationToken): ProviderResult<DebugConfiguration> {

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = window.activeTextEditor;
			if (editor && editor.document.languageId === 'COBOL') {
				config.type = 'COBOL';
				config.name = 'Launch';
				config.request = 'launch';
				config.commandLine = '${commandLine}';
				config.stopOnEntry = true;
			}
		}

		if (!config.commandLine) {
			return window.showInformationMessage("Invalid commandLine").then(_ => {
				return undefined;	// abort launch
			});
		}

		return config;
	}

}

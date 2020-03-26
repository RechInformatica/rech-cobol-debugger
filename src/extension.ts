'use strict';

import { ExtensionContext, commands, debug, DebugAdapterDescriptorFactory, languages, window } from 'vscode';
import { CobolConfigurationProvider } from './provider/CobolConfigurationProvider';
import { CobolDebugAdapterDescriptorFactory } from './provider/CobolDebugAdapterDescriptorFactory';
import { CobolEvaluatableExpressionProvider } from './provider/CobolEvaluatableExpressionProvider';
import { CUSTOM_COMMAND_STEP_OUT_PROGRAM, CUSTOM_COMMAND_RUN_TO_NEXT_PROGRAM } from './CobolDebug';
import { CobolDebugSetup } from './CobolDebuggerSetup';
import { CobolMonitorController } from './monitor/CobolMonitorController';

export function activate(context: ExtensionContext) {

	// Creates a controller to manage COBOL monitors
	const monitorController = new CobolMonitorController();

	// Extension commands
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.startDebugger', () => {
		return askAllParameters();
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.stepOutProgram', () => {
		sendCustomRequest(CUSTOM_COMMAND_STEP_OUT_PROGRAM);
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.runToNextProgram', () => {
		sendCustomRequest(CUSTOM_COMMAND_RUN_TO_NEXT_PROGRAM);
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.addCobolMonitor', () => {
		return addCobolMonitor(monitorController);
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.removeCobolMonitor', (textId: string) => {
		removeCobolMonitor(textId, monitorController);
	}));
	context.subscriptions.push(commands.registerCommand('rech.cobol.debug.removeAllCobolMonitors', () => {
		removeAllCobolMonitors(monitorController);
	}));

	// Register remaining providers
	setupExtensionProviders(context, monitorController);
}

/**
 * Asks user for debugging parameters before execution starts
 */
function askAllParameters(): Promise<string> {
	return new CobolDebugSetup().askAllParameters();
}

/**
 * Asks user for a new COBOL monitor
 */
function addCobolMonitor(controller: CobolMonitorController): Promise<void> {
	return controller.addCobolMonitor();
}

/**
 * Removes a COBOL monitor with the specified ID
 */
function removeCobolMonitor(textId: string, controller: CobolMonitorController): void {
	const id = +textId;
	controller.removeCobolMonitor(id);
}

/**
 * Removes all existing COBOL Monitors
 */
function removeAllCobolMonitors(controller: CobolMonitorController): void {
	controller.removeAllCobolMonitors();
}

/**
 * Sends a custom request do COBOL debug adapter
 *
 * @param command command to be sent in request
 */
function sendCustomRequest(command: string): void {
	if (debug.activeDebugSession) {
		debug.activeDebugSession.customRequest(command);
	}
}

/**
 * Setup needed providers for COBOL debug adapter.
 *
 * @param context extension context where providers will be registered.
 */
function setupExtensionProviders(context: ExtensionContext, controller: CobolMonitorController): void {
	registerConfigurationProvider(context);
	registerDescriptorFactory(context, controller);
	registerExpressionProvider();
}

/**
 * Register a configuration provider for 'COBOL' debug type
 *
 * @param context extension context where providers will be registered.
 */
function registerConfigurationProvider(context: ExtensionContext): void {
	const provider = new CobolConfigurationProvider();
	context.subscriptions.push(debug.registerDebugConfigurationProvider('COBOL', provider));
}

/**
 * Register an adapter factory for 'COBOL' debug type
 *
 * @param context extension context where providers will be registered.
 */
function registerDescriptorFactory(context: ExtensionContext, controller: CobolMonitorController): void {
	const factory: DebugAdapterDescriptorFactory = new CobolDebugAdapterDescriptorFactory(controller);
	context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('COBOL', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}
}

/**
 * Override VS Code's default implementation of the debug hover
 */
function registerExpressionProvider(): void {
	languages.registerEvaluatableExpressionProvider('COBOL', new CobolEvaluatableExpressionProvider());
}

/**
 * Deactivates the extension
 */
export function deactivate() {
	// nothing to do
}

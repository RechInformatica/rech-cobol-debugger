import { DebugAdapterDescriptorFactory, DebugSession, DebugAdapterExecutable, ProviderResult, DebugAdapterDescriptor, DebugAdapterServer } from "vscode";
import { CobolDebugSession } from "../CobolDebug";
import { Server, createServer, AddressInfo } from "net";
import { CobolMonitorController } from "../monitor/CobolMonitorController";

export class CobolDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {

	/** Controller for COBOL monitors */
	private controller: CobolMonitorController;

	private server?: Server;

	constructor(controller: CobolMonitorController) {
		this.controller = controller;
	}

	createDebugAdapterDescriptor(_session: DebugSession, _executable: DebugAdapterExecutable | undefined): ProviderResult<DebugAdapterDescriptor> {

		if (!this.server) {
			// start listening on a random port
			this.server = createServer(socket => {
				const session = new CobolDebugSession(this.controller);
				session.setRunAsServer(true);
				session.start(<NodeJS.ReadableStream>socket, socket);
			}).listen(0);
		}

		// make VS Code connect to debug server
		return new DebugAdapterServer((<AddressInfo>this.server.address()).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}
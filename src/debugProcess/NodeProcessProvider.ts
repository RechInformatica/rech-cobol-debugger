import { ChildProcess, exec } from "child_process";
import { ProcessProvider } from "./ProcessProvider";

/**
 * Class to interact with real Node processes
 */
export class NodeProcessProvider implements ProcessProvider {

	/** External process */
	private externalProcess: ChildProcess | undefined;

	exec(command: string, encoding: string): void {
		this.externalProcess = exec(command, {encoding: encoding});
	}

	write(command: string): void {
		this.externalProcess!.stdin.write(command);
	}

	onStdOut(callback: (chunk: string) => void): void {
		this.externalProcess!.stdout.on('data', (outdata) => {
			callback(outdata.toString('binary'));
		});
	}

	onStdErr(callback: (chunk: string) => void): void {
		this.externalProcess!.stderr.on('data', (errdata) => {
			callback(errdata.toString('binary'));
		});
	}

}

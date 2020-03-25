import { Configuration } from "./config/Configuration";
import { window } from "vscode";

/** Default selections of input boxes typed by user */
const DEFAULT_SELECTIONS: Map<string, string> = new Map<string, string>();

/**
 * Class to configure and setup COBOL debug adapter
 */
export class CobolDebugSetup {

	/**
	 * Aks for debug parameters and retrieves the final command line to
	 * start external debugging process
	 */
	public askAllParameters(): Promise<string> {
		return new Promise<string>(async (resolve) => {
			const configuration = new Configuration("rech.cobol.debug")
			const questions = configuration.get<string[]>("params");
			let commandLine = configuration.get<string>("commandline");
			for (let i = 0; i < questions.length; i++) {
				const question = questions[i];
				const defaultValue = DEFAULT_SELECTIONS.get(question);
				const token = `$${i + 1}`;
				let response = await this.askParameter(question, defaultValue);
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

	private askParameter(question: string, defaultValue: string | undefined): Thenable<string | undefined> {
		return new Promise((resolve, reject) => {
			window.showInputBox({ value: defaultValue, prompt: question, ignoreFocusOut: true }).then((response) => {
				resolve(response);
			}, (e) => reject(e));
		});
	}

}
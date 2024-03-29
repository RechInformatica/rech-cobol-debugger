import * as path from "path";
import * as fs from "fs";
import { ExternalDebugAdapter } from "./ExternalDebugAdapter";
import { execSync } from "child_process";

/**
 * Class to look for files on fallback directories
 */
export class FallbackDirectoriesFinder {

	private cachedFiles: Map<string, string> = new Map();
	private cachedAvailableSourceDirectories: string[] | undefined;
	private externalPathResolver: string | undefined;

	constructor(private externalDebugAdaptar: ExternalDebugAdapter, externalPathResolver?: string) {
		this.externalPathResolver = externalPathResolver;
	}

	public lookForSourceOnFallbackDirectories(fileName: string): Promise<string | undefined> {
		return new Promise((resolve, reject) => {
			this.requestAvailableSourceDirectories().then(directories => {
				const fullPath = directories ? this.lookOnLoadedFallbackDirectories(directories, fileName) : undefined;
				return resolve(fullPath);
			}).catch(error => reject(error));
		});
	}

	private lookOnLoadedFallbackDirectories(directories: string[], fileName: string): string | undefined {
		for (let i = 0; i < directories.length; i++) {
			const fullPath = this.lookForFileOnDirectory(directories[i], fileName);
			if (fullPath) {
				return fullPath;
			}
		}
		return undefined;
	}

	public lookForFileOnDirectory(currentDir: string, fileName: string): string | undefined {
		const cached = this.cachedFiles.get(fileName);
		return cached ? cached : this.lookForFileWithoutCache(currentDir, fileName);
	}

	private lookForFileWithoutCache(currentDir: string, fileName: string): string | undefined {
		let resolvedDir = currentDir;
		try {
			if (this.externalPathResolver && this.externalPathResolver.length != 0) {
				resolvedDir = execSync(`${this.externalPathResolver} ${currentDir}`).toString();
			}
		} catch (e) {}
		const fileOnCurrentDirectory = this.addSeparatorIfNeeded(resolvedDir.trim()) + fileName;
		if (fs.existsSync(fileOnCurrentDirectory)) {
			this.cachedFiles.set(fileName, fileOnCurrentDirectory);
			return fileOnCurrentDirectory;
		}
		return undefined;
	}

	private requestAvailableSourceDirectories(): Promise<string[] | undefined> {
		return new Promise((resolve, reject) => {
			if (this.cachedAvailableSourceDirectories) {
				return resolve(this.cachedAvailableSourceDirectories);
			}
			this.externalDebugAdaptar.requestAvailableSourceDirectories().then(directories => {
				this.cachedAvailableSourceDirectories = directories;
				return resolve(directories);
			}).catch(error => reject(error));
		});
	}

	private addSeparatorIfNeeded(directory: string): string {
		if (directory.endsWith("\\") || directory.endsWith("/")) {
			return directory;
		}
		return directory + path.sep;
	}

}

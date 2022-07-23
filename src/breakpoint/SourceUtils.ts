import { DebugProtocol } from '@vscode/debugprotocol';

/** Position within String where colon is located */
const WINDOWS_COLON_DRIVE_POSITION = 2;

/**
 * Utility class to manager Source objects from VSCode Debugger API
 */
export class SourceUtils {

	/**
	 * Normalizes the specified source object.
	 *
	 * Sometimes the VSCode API returns incomplete objects with empty path but full name on 'name' property.
	 * Besides, the API might, in the same path, slashes and backslashes.
	 *
	 * @param s source object to be normalized
	 */
	public static normalize(s: DebugProtocol.Source): void {
		s.name = SourceUtils.normalizeFileSystemLocation(s.name);
		if (s.path) {
			s.path = SourceUtils.normalizeFileSystemLocation(s.path);
		} else {
			s.path = s.name;
		}
	}

	/**
	 * Normalizes the specified file system location
	 *
	 * @param location location to be normalized
	 */
	private static normalizeFileSystemLocation(location: string | undefined): string | undefined {
		if (!location) {
			return undefined;
		}
		let normalized = location ? location : "";
		// Sometimes VSCode API returns, in the same path, slashes and backslashes
		normalized = normalized.replace(/\\/g, "/");
		// Sometimes VSCode API returns Windows drive letter with uppercase and sometimes with lowercase
		if (normalized.length > WINDOWS_COLON_DRIVE_POSITION && normalized[WINDOWS_COLON_DRIVE_POSITION - 1] == ":") {
			normalized = normalized[0].toUpperCase() + normalized.slice(1);
		}
		return normalized;
	}

	/**
	 * Check if both Source objects have the same content
	 *
	 * @param first first object to be checked
	 * @param second second object to be checked
	 */
	public static areSourcesEqual(first: DebugProtocol.Source | undefined, second: DebugProtocol.Source | undefined): boolean {
		if (!first && second) return false;
		if (!first && !second) return true;
		let targetPath: string = "";
		targetPath = second!.path ? second!.path : second!.name!;
		targetPath = targetPath ? targetPath : "";
		if (first) {
			let originSourcePath = first.path ? first.path : first.name;
			originSourcePath = originSourcePath ? originSourcePath : "";
			if (targetPath == originSourcePath) {
				return true;
			}
		}
		return false;
	}

}

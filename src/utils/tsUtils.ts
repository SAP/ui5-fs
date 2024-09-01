import {type ResourceInterface} from "../Resource.js";
import type Resource from "../Resource.js";

/**
 *
 * @param testString Variable to test if it's a string type
 */
export function isString(testString: unknown): testString is string {
	return testString instanceof String || String(testString) === testString;
}

/**
 *
 * @param resource Variable to test if it's with a Resource type
 */
export function isMigratedResource(resource: unknown): resource is Resource | ResourceInterface {
	// Check if its a fs/Resource v3, function 'hasProject' was
	// introduced with v3 therefore take it as the indicator
	return !!resource && typeof resource === "object" && ("hasProject" in resource);
}

/**
 *
 * @param error Error to test
 */
export function isError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error;
}

import Resource, {ResourceInterface} from "../Resource.js";

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

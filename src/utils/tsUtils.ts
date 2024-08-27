import Resource from "../Resource.js";

export function isString(testString: unknown): testString is string {
	return testString instanceof String || String(testString) === testString;
}

export function isLegacyResource(resource: unknown): resource is Resource {
	// Check if its a fs/Resource v3, function 'hasProject' was
	// introduced with v3 therefore take it as the indicator
	return !!resource && !Object.hasOwnProperty.call(resource, "hasProject");
}

export function isString(testString: unknown): testString is string {
	return testString instanceof String;
}

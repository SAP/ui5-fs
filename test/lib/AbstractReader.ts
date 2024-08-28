import test from "ava";
import AbstractReader from "../../src/AbstractReader.js";

test("AbstractReader: constructor throws an error", (t) => {
	t.throws(() => {
		new AbstractReader();
	}, {
		instanceOf: TypeError,
		message: "Class 'AbstractReader' is abstract",
	});
});

test("Incomplete AbstractReader subclass: Abstract functions throw error", async (t) => {
	class Dummy extends AbstractReader {}

	const instance = new Dummy();
	await t.throwsAsync(async () => {
		// @ts-expect-error testing invalid value
		await instance._byGlob();
	}, {
		instanceOf: Error,
		message: "Function '_byGlob' is not implemented",
	});

	await t.throwsAsync(async () => {
		// @ts-expect-error testing invalid value
		await instance._runGlob();
	}, {
		instanceOf: Error,
		message: "Function '_runGlob' is not implemented",
	});

	await t.throwsAsync(async () => {
		// @ts-expect-error testing invalid value
		await instance._byPath();
	}, {
		instanceOf: Error,
		message: "Function '_byPath' is not implemented",
	});
});

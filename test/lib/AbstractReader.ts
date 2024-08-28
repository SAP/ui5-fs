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

test("Incomplete AbstractReader subclass: Abstract functions throw error", (t) => {
	class Dummy extends AbstractReader {}

	const instance = new Dummy();
	t.throws(async () => {
		await instance._byGlob();
	}, {
		instanceOf: Error,
		message: "Function '_byGlob' is not implemented",
	});

	t.throws(async () => {
		await instance._runGlob();
	}, {
		instanceOf: Error,
		message: "Function '_runGlob' is not implemented",
	});

	t.throws(async () => {
		await instance._byPath();
	}, {
		instanceOf: Error,
		message: "Function '_byPath' is not implemented",
	});
});

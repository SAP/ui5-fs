import test from "ava";
import AbstractReaderWriter from "../../lib/AbstractReaderWriter.js";

test("AbstractReaderWriter: constructor throws an error", (t) => {
	t.throws(() => {
		new AbstractReaderWriter();
	}, {
		instanceOf: TypeError,
		message: "Class 'AbstractReaderWriter' is abstract"
	});
});

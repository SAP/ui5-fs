const test = require("ava");
const sinon = require("sinon");
const ReaderFilter = require("../../lib/ReaderFilter");

test("_byGlob: Basic filter", async (t) => {
	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve(["resource a", "resource b"]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderFilter({
		reader: abstractReader,
		filterCallback: function(resource) {
			if (resource === "resource a") {
				return false;
			}
			return true;
		}
	});

	const resources = await readerCollection._byGlob("anyPattern", {}, trace);
	t.deepEqual(resources, ["resource b"], "Correct resource in result");
});

test("_byPath: Negative filter", async (t) => {
	const abstractReader = {
		_byPath: sinon.stub().returns(Promise.resolve("resource a"))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderFilter({
		reader: abstractReader,
		filterCallback: function(resource) {
			if (resource === "resource a") {
				return false;
			}
			return true;
		}
	});

	const resources = await readerCollection._byPath("anyPattern", {}, trace);
	t.deepEqual(resources, null, "Correct empty in result");
});

test("_byPath: Positive filter", async (t) => {
	const abstractReader = {
		_byPath: sinon.stub().returns(Promise.resolve("resource b"))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderFilter({
		reader: abstractReader,
		filterCallback: function(resource) {
			if (resource === "resource a") {
				return false;
			}
			return true;
		}
	});

	const resources = await readerCollection._byPath("anyPattern", {}, trace);
	t.deepEqual(resources, "resource b", "Correct resource in result");
});

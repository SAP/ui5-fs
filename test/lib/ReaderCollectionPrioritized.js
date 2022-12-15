import test from "ava";
import sinon from "sinon";
import ReaderCollectionPrioritized from "../../lib/ReaderCollectionPrioritized.js";
import Resource from "../../lib/Resource.js";

test("ReaderCollectionPrioritized: constructor", (t) => {
	const readerCollectionPrioritized = new ReaderCollectionPrioritized({
		name: "myReader",
		readers: [{}, {}, {}]
	});

	t.is(readerCollectionPrioritized.getName(), "myReader", "correct name assigned");
	t.deepEqual(readerCollectionPrioritized._readers, [{}, {}, {}], "correct readers assigned");
});

test("ReaderCollectionPrioritized: _byGlob w/o finding a resource", async (t) => {
	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve([]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollectionPrioritized = new ReaderCollectionPrioritized({
		name: "myReader",
		readers: [abstractReader]
	});
	const resources = await readerCollectionPrioritized._byGlob("anyPattern", {someOption: true}, trace);

	t.true(Array.isArray(resources), "Found resources are returned as an array");
	t.true(resources.length === 0, "No resources found");
	t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
		"Delegated globbing task correctly to readers");
	t.true(trace.collection.called, "Trace.collection called");
});

test("ReaderCollectionPrioritized: _byGlob with finding a resource", async (t) => {
	const resource = new Resource({
		path: "my/path",
		buffer: Buffer.from("content")
	});
	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve([resource]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollectionPrioritized = new ReaderCollectionPrioritized({
		name: "myReader",
		readers: [abstractReader]
	});

	const resources = await readerCollectionPrioritized._byGlob("anyPattern", {someOption: true}, trace);
	const resourceContent = await resources[0].getString();

	t.true(Array.isArray(resources), "Found resources are returned as an array");
	t.true(resources.length === 1, "Resource found");
	t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
		"Delegated globbing task correctly to readers");
	t.true(trace.collection.called, "Trace.collection called");
	t.is(resources[0].getPath(), "my/path", "Resource has expected path");
	t.is(resourceContent, "content", "Resource has expected content");
});

test("ReaderCollectionPrioritized: _byPath with reader finding a resource", async (t) => {
	const resource = new Resource({
		path: "my/path",
		buffer: Buffer.from("content")
	});
	const pushCollectionSpy = sinon.spy(resource, "pushCollection");
	const abstractReader = {
		_byPath: sinon.stub().returns(Promise.resolve(resource))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollectionPrioritized = new ReaderCollectionPrioritized({
		name: "myReader",
		readers: [abstractReader]
	});

	const readResource = await readerCollectionPrioritized._byPath("anyVirtualPath", {someOption: true}, trace);
	const readResourceContent = await resource.getString();

	t.true(abstractReader._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
		"Delegated globbing task correctly to readers");
	t.true(pushCollectionSpy.called, "pushCollection called on resource");
	t.is(readResource.getPath(), "my/path", "Resource has expected path");
	t.is(readResourceContent, "content", "Resource has expected content");
});

test("ReaderCollectionPrioritized: _byPath with two readers both finding no resource", async (t) => {
	const abstractReaderOne = {
		_byPath: sinon.stub().returns(Promise.resolve())
	};
	const abstractReaderTwo = {
		_byPath: sinon.stub().returns(Promise.resolve())
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollectionPrioritized = new ReaderCollectionPrioritized({
		name: "myReader",
		readers: [abstractReaderOne, abstractReaderTwo]
	});

	const resource = await readerCollectionPrioritized._byPath("anyVirtualPath", {someOption: true}, trace);

	t.falsy(resource, "No resource found");
	t.true(abstractReaderOne._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
		"Delegated globbing task correctly to reader one");
	t.true(abstractReaderTwo._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
		"Delegated globbing task correctly to reader two");
});

test("ReaderCollectionPrioritized: Throws for empty readers array", (t) => {
	t.throws(() => {
		new ReaderCollectionPrioritized({
			name: "myReader",
			readers: []
		});
	}, {
		message: "Cannot create ReaderCollectionPrioritized myReader: Provided list of readers is empty"
	});

	t.throws(() => {
		new ReaderCollectionPrioritized({
			name: "myReader",

			// This can happen for example in custom tasks where the dependencies reader
			// might not always be defined:
			readers: [undefined]
		});
	}, {
		message: "Cannot create ReaderCollectionPrioritized myReader: Provided list of readers is empty"
	});
});

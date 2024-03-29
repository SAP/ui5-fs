import test from "ava";
import sinon from "sinon";
import ReaderCollection from "../../lib/ReaderCollection.js";
import Resource from "../../lib/Resource.js";

test("ReaderCollection: constructor", (t) => {
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [{}, {}, {}]
	});

	t.is(readerCollection.getName(), "myReader", "correct name assigned");
	t.deepEqual(readerCollection._readers, [{}, {}, {}], "correct readers assigned");
});

test("ReaderCollection: _byGlob w/o finding a resource", async (t) => {
	t.plan(4);

	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve([]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader]
	});
	const resources = await readerCollection._byGlob("anyPattern", {someOption: true}, trace);

	t.true(Array.isArray(resources), "Found resources are returned as an array");
	t.true(resources.length === 0, "No resources found");
	t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
		"Delegated globbing task correctly to readers");
	t.true(trace.collection.called, "Trace.collection called");
});

test("ReaderCollection: _byGlob with finding a resource", async (t) => {
	t.plan(6);

	const resource = new Resource({
		path: "/my/path",
		buffer: Buffer.from("content")
	});
	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve([resource]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader]
	});

	const resources = await readerCollection._byGlob("anyPattern", {someOption: true}, trace);
	const resourceContent = await resources[0].getString();

	t.true(Array.isArray(resources), "Found resources are returned as an array");
	t.true(resources.length === 1, "Resource found");
	t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
		"Delegated globbing task correctly to readers");
	t.true(trace.collection.called, "Trace.collection called");
	t.is(resources[0].getPath(), "/my/path", "Resource has expected path");
	t.is(resourceContent, "content", "Resource has expected content");
});

test("ReaderCollection: _byPath with reader finding a resource", async (t) => {
	t.plan(5);

	const resource = new Resource({
		path: "/my/path",
		buffer: Buffer.from("content")
	});
	const pushCollectionSpy = sinon.spy(resource, "pushCollection");
	const abstractReader = {
		_byPath: sinon.stub().returns(Promise.resolve(resource))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader]
	});

	const readResource = await readerCollection._byPath("anyVirtualPath", {someOption: true}, trace);
	const readResourceContent = await resource.getString();

	t.true(abstractReader._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
		"Delegated globbing task correctly to readers");
	t.true(trace.collection.called, "Trace.collection called");
	t.true(pushCollectionSpy.called, "pushCollection called on resource");
	t.is(readResource.getPath(), "/my/path", "Resource has expected path");
	t.is(readResourceContent, "content", "Resource has expected content");
});

test("ReaderCollection: _byPath with two readers both finding no resource", async (t) => {
	t.plan(4);

	const abstractReaderOne = {
		_byPath: sinon.stub().returns(Promise.resolve())
	};
	const abstractReaderTwo = {
		_byPath: sinon.stub().returns(Promise.resolve())
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReaderOne, abstractReaderTwo]
	});

	const resource = await readerCollection._byPath("anyVirtualPath", {someOption: true}, trace);

	t.falsy(resource, "No resource found");
	t.true(abstractReaderOne._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
		"Delegated globbing task correctly to reader one");
	t.true(abstractReaderTwo._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
		"Delegated globbing task correctly to reader two");
	t.true(trace.collection.calledTwice, "Trace.collection called");
});

test("ReaderCollection: _byPath with empty readers array", async (t) => {
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: []
	});

	const resource = await readerCollection._byPath("anyVirtualPath", {someOption: true}, trace);
	t.is(resource, null, "Promise resolves to null, as no readers got configured");
});

test("ReaderCollection: _byPath with some empty readers", async (t) => {
	const resource = new Resource({
		path: "/my/path",
		buffer: Buffer.from("content")
	});
	const abstractReaderOne = {
		_byPath: sinon.stub().resolves(resource)
	};
	const abstractReaderTwo = {
		_byPath: sinon.stub().resolves()
	};

	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReaderOne, undefined, abstractReaderTwo]
	});

	const res = await readerCollection._byPath("anyVirtualPath", {someOption: true}, trace);
	t.is(res, resource, "Found expected resource");
});

test("ReaderCollection: _byGlob with empty readers array", async (t) => {
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: []
	});

	const resource = await readerCollection.byGlob("anyPattern", {someOption: true}, trace);
	t.deepEqual(resource, [], "Promise resolves to null, as no readers got configured");
});

test("ReaderCollection: _byGlob with some empty readers", async (t) => {
	const resource = new Resource({
		path: "/my/path",
		buffer: Buffer.from("content")
	});
	const abstractReaderOne = {
		_byGlob: sinon.stub().resolves([resource])
	};
	const abstractReaderTwo = {
		_byGlob: sinon.stub().resolves([])
	};

	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReaderOne, undefined, abstractReaderTwo]
	});

	const res = await readerCollection._byGlob("anyVirtualPath", {someOption: true}, trace);
	t.is(res.length, 1, "Found one resource");
	t.is(res[0], resource, "Found expected resource");
});

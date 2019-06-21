const test = require("ava");
const sinon = require("sinon");
const ReaderCollection = require("../../lib/ReaderCollection");
const Resource = require("../../lib/Resource");

test("ReaderCollection: constructor", (t) => {
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [{}, {}, {}]
	});

	t.deepEqual(readerCollection._name, "myReader", "correct name assigned");
	t.deepEqual(readerCollection._readers, [{}, {}, {}], "correct readers assigned");
});

test("ReaderCollection: _byGlob w/o finding a resource", (t) => {
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

	return readerCollection._byGlob("anyPattern", {someOption: true}, trace)
		.then(function(resources) {
			t.true(Array.isArray(resources), "Found resources are returned as an array");
			t.true(resources.length === 0, "No resources found");
			t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
				"Delegated globbing task correctly to readers");
			t.true(trace.collection.called, "Trace.collection called");
		});
});

test("ReaderCollection: _byGlob with finding a resource", (t) => {
	t.plan(6);

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
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader]
	});

	return readerCollection._byGlob("anyPattern", {someOption: true}, trace)
		.then(function(resources) {
			t.true(Array.isArray(resources), "Found resources are returned as an array");
			t.true(resources.length === 1, "Resource found");
			t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
				"Delegated globbing task correctly to readers");
			t.true(trace.collection.called, "Trace.collection called");
			t.deepEqual(resources[0].getPath(), "my/path", "Resource has expected path");
			return resources[0].getString().then(function(content) {
				t.deepEqual(content, "content", "Resource has expected content");
			});
		});
});

test("ReaderCollection: _byGlob with duplicate resources", async (t) => {
	const resource1 = new Resource({
		path: "my/path",
		buffer: Buffer.from("content")
	});

	const resource2 = new Resource({
		path: "my/path",
		buffer: Buffer.from("content")
	});
	const abstractReader1 = {
		_byGlob: sinon.stub().returns(Promise.resolve([resource1]))
	};
	const abstractReader2 = {
		_byGlob: sinon.stub().returns(Promise.resolve([resource2]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader1, abstractReader2]
	});

	const res = await readerCollection._byGlob("anyPattern", {nodir: true}, trace);
	t.deepEqual(res.length, 2, "Two resources found");
	t.deepEqual(res[0].getPath(), "my/path", "Resource 1 has expected path");
	t.deepEqual(res[1].getPath(), "my/path", "Resource 2 has expected path (same as 1)");
});

test("ReaderCollection: _byGlob with duplicate directories", async (t) => {
	const fnTrue = () => true;
	const fnFalse = () => false;
	const dirStatInfo = {
		isFile: fnFalse,
		isDirectory: fnTrue,
		isBlockDevice: fnFalse,
		isCharacterDevice: fnFalse,
		isSymbolicLink: fnFalse,
		isFIFO: fnFalse,
		isSocket: fnFalse,
		atimeMs: new Date().getTime(),
		mtimeMs: new Date().getTime(),
		ctimeMs: new Date().getTime(),
		birthtimeMs: new Date().getTime(),
		atime: new Date(),
		mtime: new Date(),
		ctime: new Date(),
		birthtime: new Date()
	};

	const resource1 = new Resource({
		path: "my/dir",
		statInfo: dirStatInfo
	});

	const resource2 = new Resource({
		path: "my/dir",
		statInfo: dirStatInfo
	});
	const abstractReader1 = {
		_byGlob: sinon.stub().returns(Promise.resolve([resource1]))
	};
	const abstractReader2 = {
		_byGlob: sinon.stub().returns(Promise.resolve([resource2]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader1, abstractReader2]
	});

	const res = await readerCollection._byGlob("anyPattern", {nodir: true}, trace);
	t.deepEqual(res.length, 2, "Two resources found");
	t.deepEqual(res[0].getPath(), "my/dir", "Resource 1 has expected path");
	t.deepEqual(res[1].getPath(), "my/dir", "Resource 2 has expected path (same as 1)");
});

test("ReaderCollection: _byPath with reader finding a resource", (t) => {
	t.plan(5);

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
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [abstractReader]
	});

	return readerCollection._byPath("anyVirtualPath", {someOption: true}, trace)
		.then(function(resource) {
			t.true(abstractReader._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
				"Delegated globbing task correctly to readers");
			t.true(trace.collection.called, "Trace.collection called");
			t.true(pushCollectionSpy.called, "pushCollection called on resource");
			t.deepEqual(resource.getPath(), "my/path", "Resource has expected path");
			return resource.getString().then(function(content) {
				t.deepEqual(content, "content", "Resource has expected content");
			});
		});
});

test("ReaderCollection: _byPath with two readers both finding no resource", (t) => {
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

	return readerCollection._byPath("anyVirtualPath", {someOption: true}, trace)
		.then(function(resource) {
			t.falsy(resource, "No resource found");
			t.true(abstractReaderOne._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
				"Delegated globbing task correctly to reader one");
			t.true(abstractReaderTwo._byPath.calledWithExactly("anyVirtualPath", {someOption: true}, trace),
				"Delegated globbing task correctly to reader two");
			t.true(trace.collection.calledTwice, "Trace.collection called");
		});
});

test("ReaderCollection: _byPath with empty readers array", (t) => {
	t.plan(1);

	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: []
	});

	return readerCollection._byPath("anyVirtualPath", {someOption: true}, trace)
		.then(function(resource) {
			t.is(resource, undefined, "Promise resolves to undefined, as no readers got configured");
		});
});


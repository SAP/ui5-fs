const {test} = require("ava");
const sinon = require("sinon");
const ReaderCollection = require("../../lib/ReaderCollection");
const Resource = require("../../lib/Resource");

test("ReaderCollection: constructor", (t) => {
	t.plan(2);

	const readerCollection = new ReaderCollection({
		name: "myReader",
		readers: [{}, {}, {}]
	});

	t.deepEqual(readerCollection._name, "myReader", "correct name assigned");
	t.deepEqual(readerCollection._readers, [{}, {}, {}], "correct readers assigned");
});

test("ReaderCollection: _byGlob", (t) => {
	t.plan(3);

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
			t.true(abstractReader._byGlob.calledWithExactly("anyPattern", {someOption: true}, trace),
				"Delegated globbing task correctly to readers");
			t.true(trace.collection.called, "Trace.collection called");
		});
});

test("ReaderCollection: _byPath with reader finding a resource", (t) => {
	t.plan(5);

	const resource = new Resource({
		path: "path",
		buffer: new Buffer("content")
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
			resource.getString().then(function(content) {
				t.deepEqual(content, "content", "Resource has expected content");
			});
			t.deepEqual(resource.getPath(), "path", "Resource has expected path");
		});
});

test("ReaderCollection: _byPath with two readers both finding no resource", (t) => {
	t.plan(3);

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


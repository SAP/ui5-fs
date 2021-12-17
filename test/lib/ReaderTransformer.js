const test = require("ava");
const sinon = require("sinon");
const ReaderTransformer = require("../../lib/ReaderTransformer");

function getDummyResource(name) {
	return {
		name,
		clone: function() {
			return getDummyResource(name);
		}
	};
}

test("_byGlob: Basic transformation", async (t) => {
	const resourceA = getDummyResource("resource a");
	const resourceB = getDummyResource("resource b");
	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve([resourceA, resourceB]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderTransformer({
		reader: abstractReader,
		callback: function(resource) {
			if (resource.name === "resource a") {
				resource.name = "transformed resource a";
			}
		}
	});

	const resources = await readerCollection._byGlob("anyPattern", {}, trace);
	t.deepEqual(resources.length, 2, "Still two resources in result set");
	t.deepEqual(resources[0].name, "transformed resource a", "resource a has been transformed in result");
	t.deepEqual(resources[1].name, "resource b", "resource b has not been transformed");
	t.not(resources[1], resourceB, "resource b instance has been cloned");
	t.deepEqual(resourceA.name, "resource a", "Original resource a has not been transformed");
});

test("_byPath: Basic transformation", async (t) => {
	const resourceA = getDummyResource("resource a");
	const abstractReader = {
		_byPath: sinon.stub().returns(resourceA)
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderTransformer({
		reader: abstractReader,
		callback: function(resource) {
			resource.name = "transformed resource a";
		}
	});

	const resource = await readerCollection._byPath("anyPattern", {}, trace);

	t.deepEqual(resource.name, "transformed resource a", "resource a has been transformed in result");
	t.deepEqual(resourceA.name, "resource a", "Original resource a has not been transformed");
});

test("_byPath: No transformation", async (t) => {
	const resourceB = getDummyResource("resource b");
	const abstractReader = {
		_byPath: sinon.stub().returns(resourceB)
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderTransformer({
		reader: abstractReader,
		callback: function(resource) {
			return;
		}
	});

	const resource = await readerCollection._byPath("anyPattern", {}, trace);
	t.deepEqual(resource.name, "resource b", "Correct resource in result");
	t.not(resource, resourceB, "resource b instance has been cloned");
});


test("async _byGlob: Basic transformation", async (t) => {
	const resourceA = getDummyResource("resource a");
	const resourceB = getDummyResource("resource b");
	const abstractReader = {
		_byGlob: sinon.stub().returns(Promise.resolve([resourceA, resourceB]))
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderTransformer({
		reader: abstractReader,
		callback: function(resource) {
			return new Promise((resolve) => {
				setTimeout(() => {
					if (resource.name === "resource a") {
						resource.name = "transformed resource a";
					}
					resolve();
				}, 10);
			});
		}
	});

	const resources = await readerCollection._byGlob("anyPattern", {}, trace);
	t.deepEqual(resources.length, 2, "Still two resources in result set");
	t.deepEqual(resources[0].name, "transformed resource a", "resource a has been transformed in result");
	t.deepEqual(resources[1].name, "resource b", "resource b has not been transformed");
	t.not(resources[1], resourceB, "resource b instance has been cloned");
	t.deepEqual(resourceA.name, "resource a", "Original resource a has not been transformed");
});

test("async _byPath: Basic transformation", async (t) => {
	const resourceA = getDummyResource("resource a");
	const abstractReader = {
		_byPath: sinon.stub().returns(resourceA)
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderTransformer({
		reader: abstractReader,
		callback: function(resource) {
			return new Promise((resolve) => {
				setTimeout(() => {
					resource.name = "transformed resource a";
					resolve();
				}, 10);
			});
		}
	});

	const resource = await readerCollection._byPath("anyPattern", {}, trace);

	t.deepEqual(resource.name, "transformed resource a", "resource a has been transformed in result");
	t.deepEqual(resourceA.name, "resource a", "Original resource a has not been transformed");
});

test("async _byPath: No transformation", async (t) => {
	const resourceB = getDummyResource("resource b");
	const abstractReader = {
		_byPath: sinon.stub().returns(resourceB)
	};
	const trace = {
		collection: sinon.spy()
	};
	const readerCollection = new ReaderTransformer({
		reader: abstractReader,
		callback: async function(resource) {
			return;
		}
	});

	const resource = await readerCollection._byPath("anyPattern", {}, trace);
	t.deepEqual(resource.name, "resource b", "Correct resource in result");
	t.not(resource, resourceB, "resource b instance has been cloned");
});

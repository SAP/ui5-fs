const {test} = require("ava");
const chai = require("chai");
const path = require("path");
chai.use(require("chai-fs"));
const assert = chai.assert;
const sinon = require("sinon");

const ui5Fs = require("../../");
const applicationBPath = path.join(__dirname, "..", "fixtures", "application.b");

// Create readerWriters before running tests
test.beforeEach((t) => {
	t.context.readerWriters = {
		source: ui5Fs.resourceFactory.createAdapter({
			fsBasePath: "./test/fixtures/application.a/webapp",
			virBasePath: "/app/"
		}),
		dest: ui5Fs.resourceFactory.createAdapter({
			fsBasePath: "./test/tmp/readerWriters/application.a",
			virBasePath: "/dest/"
		})
	};
});

test.afterEach.always((t) => {
	sinon.restore();
});

/* BEWARE:
	Always make sure that every test writes to a separate file! By default, tests are running concurrent.
*/
test("Get resource from application.a (/index.html) and write it to /dest/ using a ReadableStream", (t) => {
	const readerWriters = t.context.readerWriters;
	// Get resource from one readerWriter
	return t.notThrows(readerWriters.source.byPath("/app/index.html")
		.then(function(resource) {
			return resource.clone();
		})
		.then(function(newResource) {
			// Write resource content to another readerWriter
			newResource.setPath("/dest/index_readableStreamTest.html");
			return readerWriters.dest.write(newResource);
		}).then(() => {
			assert.fileEqual("./test/tmp/readerWriters/application.a/index_readableStreamTest.html",
				"./test/fixtures/application.a/webapp/index.html");
		}));
});

test("createCollectionsForTree: high level test", (t) => {
	// Creates resource reader collections for a given tree
	const resourceReaders = ui5Fs.resourceFactory.createCollectionsForTree(applicationBTree);

	t.pass("Resource Readers created");

	// Check whether resulting object contains both,
	// resource readers for the application source itself and for its dependencies.
	t.true(resourceReaders.hasOwnProperty("source"), "Contains readers for the application code");
	t.true(resourceReaders.hasOwnProperty("dependencies"), "Contains readers for the application's dependencies");

	t.true(resourceReaders.source._readers.length === 1, "One reader for the application code");
	t.true(resourceReaders.dependencies._readers.length === 8, "Eight readers for the application's dependencies");
});

// TODO: Implement proper createCollectionsForTree unit test

test.serial("createCollectionsForTree with excludes", (t) => {
	const createAdapterSpy = sinon.spy(ui5Fs.resourceFactory, "createAdapter");
	ui5Fs.resourceFactory.createCollectionsForTree(applicationBTreeWithExcludes, {
		getProjectExcludes: (proj) => {
			return proj.pony.excludes;
		}
	});

	t.deepEqual(createAdapterSpy.callCount, 5, "createAdapter got called three times");

	const firstCall = createAdapterSpy.getCall(0).args[0];
	t.deepEqual(firstCall.fsBasePath, path.join(applicationBPath, "webapp"),
		"First createAdapter call: Correct base path supplied");
	t.deepEqual(firstCall.excludes, ["/pony-path/*"],
		"First createAdapter call: Correct exclude patterns supplied");

	const secondCall = createAdapterSpy.getCall(1).args[0];
	t.deepEqual(secondCall.fsBasePath,
		path.join(applicationBPath, "node_modules", "library.d", "main", "src"),
		"Second createAdapter call: Correct base path supplied");
	t.deepEqual(secondCall.excludes, [
		"/unicorn-path/*",
		"/duck-path/*"
	],
	"Second createAdapter call: Correct exclude patterns supplied");

	const thirdCall = createAdapterSpy.getCall(2).args[0];
	t.deepEqual(thirdCall.fsBasePath,
		path.join(applicationBPath, "node_modules", "library.d", "main", "test"),
		"Third createAdapter call: Correct base path supplied");
	t.deepEqual(thirdCall.excludes, [
		"/unicorn-path/*",
		"/duck-path/*"
	],
	"Third createAdapter call: Correct exclude patterns supplied");

	const fourthCall = createAdapterSpy.getCall(3).args[0];
	t.deepEqual(fourthCall.fsBasePath,
		path.join(applicationBPath, "node_modules", "collection", "library.a", "src"),
		"Fourth createAdapter call: Correct base path supplied");
	t.deepEqual(fourthCall.excludes, ["/duck-path/*"],
		"Fourth createAdapter call: Correct exclude patterns supplied");

	const fifthCall = createAdapterSpy.getCall(4).args[0];
	t.deepEqual(fifthCall.fsBasePath,
		path.join(applicationBPath, "node_modules", "collection", "library.a", "test"),
		"Fifth createAdapter call: Correct base path supplied");
	t.deepEqual(fifthCall.excludes, ["/duck-path/*"],
		"Fifth createAdapter call: Correct exclude patterns supplied");
});

test.serial("createFsAdapterForVirtualBasePath", (t) => {
	const createAdapterSpy = sinon.spy(ui5Fs.resourceFactory, "createAdapter");

	const fsAdapter = ui5Fs.resourceFactory.createFsAdapterForVirtualBasePath({
		project: applicationBTreeWithExcludes,
		virBasePath: "/",
		useNamespace: true,
		getProjectExcludes: () => {
			return [
				"{/sub-directory-1/,/sub-directory-2/}**",
				"/pony-path/**",
				"!/duck*path/**",
				"!**.json"
			];
		}
	});

	t.deepEqual(createAdapterSpy.callCount, 1, "createAdapter got called one time");
	const firstCall = createAdapterSpy.getCall(0).args[0];
	t.deepEqual(firstCall.fsBasePath, path.join(applicationBPath, "webapp"),
		"First createAdapter call: Correct base path supplied");
	t.deepEqual(firstCall.excludes, [
		"/resources/id1/sub-directory-1/**",
		"/resources/id1/sub-directory-2/**",
		"/resources/id1/pony-path/**",
		"!/resources/id1/duck*path/**",
		"!/resources/id1/**.json"
	],
	"First createAdapter call: Correct exclude patterns supplied");

	t.deepEqual(fsAdapter._fsBasePath, path.join(applicationBPath, "webapp"), "Returned an FS adapter");
	// t.deepEqual(fsAdapter);
});

/* Test data */
const applicationBTree = {
	"id": "application.b",
	"version": "1.0.0",
	"path": applicationBPath,
	"dependencies": [
		{
			"id": "library.d",
			"version": "1.0.0",
			"path": path.join(applicationBPath, "node_modules", "library.d"),
			"dependencies": [],
			"_level": 1,
			"specVersion": "0.1",
			"type": "library",
			"metadata": {
				"name": "library.d",
				"copyright": "Some fancy copyright"
			},
			"resources": {
				"configuration": {
					"paths": {
						"src": "main/src",
						"test": "main/test"
					}
				},
				"pathMappings": {
					"/resources/": "main/src",
					"/test-resources/": "main/test"
				}
			}
		},
		{
			"id": "library.a",
			"version": "1.0.0",
			"path": path.join(applicationBPath, "node_modules", "collection", "library.a"),
			"dependencies": [],
			"_level": 1,
			"specVersion": "0.1",
			"type": "library",
			"metadata": {
				"name": "library.a",
				"copyright": "${copyright}"
			},
			"resources": {
				"configuration": {
					"paths": {
						"src": "src",
						"test": "test"
					}
				},
				"pathMappings": {
					"/resources/": "src",
					"/test-resources/": "test"
				}
			}
		},
		{
			"id": "library.b",
			"version": "1.0.0",
			"path": path.join(applicationBPath, "node_modules", "collection", "library.b"),
			"dependencies": [],
			"_level": 1,
			"specVersion": "0.1",
			"type": "library",
			"metadata": {
				"name": "library.b",
				"copyright": "${copyright}"
			},
			"resources": {
				"configuration": {
					"paths": {
						"src": "src",
						"test": "test"
					}
				},
				"pathMappings": {
					"/resources/": "src",
					"/test-resources/": "test"
				}
			}
		},
		{
			"id": "library.c",
			"version": "1.0.0",
			"path": path.join(applicationBPath, "node_modules", "collection", "library.c"),
			"dependencies": [],
			"_level": 1,
			"specVersion": "0.1",
			"type": "library",
			"metadata": {
				"name": "library.c",
				"copyright": "${copyright}"
			},
			"resources": {
				"configuration": {
					"paths": {
						"src": "src",
						"test": "test"
					}
				},
				"pathMappings": {
					"/resources/": "src",
					"/test-resources/": "test"
				}
			}
		}
	],
	"builder": {},
	"_level": 0,
	"specVersion": "0.1",
	"type": "application",
	"metadata": {
		"name": "application.b",
		"namespace": "id1"
	},
	"resources": {
		"configuration": {
			"paths": {
				"webapp": "webapp"
			}
		},
		"pathMappings": {
			"/": "webapp"
		}
	}
};

const applicationBTreeWithExcludes = {
	"id": "application.b",
	"version": "1.0.0",
	"path": applicationBPath,
	"dependencies": [
		{
			"id": "library.d",
			"version": "1.0.0",
			"path": path.join(applicationBPath, "node_modules", "library.d"),
			"dependencies": [],
			"_level": 1,
			"specVersion": "0.1",
			"type": "library",
			"metadata": {
				"name": "library.d",
				"copyright": "Some fancy copyright"
			},
			"pony": {
				"excludes": [
					"/unicorn-path/*",
					"/duck-path/*"
				]
			},
			"resources": {
				"configuration": {
					"paths": {
						"src": "main/src",
						"test": "main/test"
					}
				},
				"pathMappings": {
					"/resources/": "main/src",
					"/test-resources/": "main/test"
				}
			}
		},
		{
			"id": "library.a",
			"version": "1.0.0",
			"path": path.join(applicationBPath, "node_modules", "collection", "library.a"),
			"dependencies": [],
			"_level": 1,
			"specVersion": "0.1",
			"type": "library",
			"metadata": {
				"name": "library.a",
				"copyright": "${copyright}"
			},
			"pony": {
				"excludes": [
					"/duck-path/*"
				]
			},
			"resources": {
				"configuration": {
					"paths": {
						"src": "src",
						"test": "test"
					}
				},
				"pathMappings": {
					"/resources/": "src",
					"/test-resources/": "test"
				}
			}
		},
	],
	"pony": {
		"excludes": [
			"/pony-path/*"
		]
	},
	"_level": 0,
	"specVersion": "0.1",
	"type": "application",
	"metadata": {
		"name": "application.b",
		"namespace": "id1"
	},
	"resources": {
		"configuration": {
			"paths": {
				"webapp": "webapp"
			}
		},
		"pathMappings": {
			"/": "webapp"
		}
	}
};

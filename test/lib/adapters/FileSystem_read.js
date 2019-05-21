const {test} = require("ava");
const {resourceFactory} = require("../../../");

test("glob resources from application.a w/ virtual base path prefix", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/"
	});

	await readerWriter.byGlob("/app/**/*.html").then(function(resources) {
		t.deepEqual(resources.length, 1, "Found exactly one resource");
	});
});

test("glob resources from application.a w/o virtual base path prefix", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/"
	});

	await readerWriter.byGlob("/**/*.html").then(function(resources) {
		t.deepEqual(resources.length, 1, "Found exactly one resource");
	});
});

test("glob resources from application.a w/ virtual base path prefix", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/"
	});

	const resources = await readerWriter.byGlob("/app/**/*.html");
	t.deepEqual(resources.length, 1, "Found exactly one resource");
});

test("glob resources from application.a w/o virtual base path prefix", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/"
	});

	const resources = await readerWriter.byGlob("/**/*.html");
	t.deepEqual(resources.length, 1, "Found exactly one resource");
});

test("glob virtual directory w/o virtual base path prefix", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/"
	});

	const resources = await readerWriter.byGlob("/*", {nodir: false});
	t.deepEqual(resources.length, 1, "Found exactly one resource");
});

test("glob virtual directory w/ virtual base path prefix", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/one/two/"
	});

	const resources = await readerWriter.byGlob("/app/*", {nodir: false});
	t.deepEqual(resources.length, 1, "Found exactly one resource");
});

test("glob virtual directory w/o virtual base path prefix and nodir: true", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/"
	});

	const resources = await readerWriter.byGlob("/*", {nodir: true});
	t.deepEqual(resources.length, 0, "Found no resources");
});

test("glob virtual directory w/ virtual base path prefix and nodir: true", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/app/one/two/"
	});

	const resources = await readerWriter.byGlob("/app/*", {nodir: true});
	t.deepEqual(resources.length, 0, "Found no resources");
});

test("glob library with static excludes", async (t) => {
	const excludes = [
		"/resources/**/some.js",
		"/test-resources/**"
	];
	const srcReaderWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/library.l/src",
		virBasePath: "/resources/",
		excludes
	});

	const testReaderWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/library.l/test",
		virBasePath: "/test-resources/",
		excludes
	});

	const srcResources = await srcReaderWriter.byGlob("/**/*", {nodir: true});
	const testResources = await testReaderWriter.byGlob("/**/*", {nodir: true});
	t.deepEqual(srcResources.length, 1, "Found one src resource");
	t.deepEqual(testResources.length, 0, "Found no test resources");
});

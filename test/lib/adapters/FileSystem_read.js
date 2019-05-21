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

test("byPath virtual directory w/ virtual base path prefix and nodir: true", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/resources/app/"
	});

	const resource = await readerWriter.byPath("/resources/app/index.html", {nodir: true});
	t.truthy(resource, "Found one resource");
});

test("byPath: exclude everything in sub-directory", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/resources/app/",
		excludes: ["/resources/app/**"]
	});

	const resource = await readerWriter.byPath("/resources/app/index.html", {nodir: true});
	t.falsy(resource, "Found no resource");
});

test("byPath: exclude with negation", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/resources/app/",
		excludes: [
			"/resources/app/**",
			"!/resources/app/index.html"
		]
	});

	const resource = await readerWriter.byPath("/resources/app/index.html", {nodir: true});
	t.truthy(resource, "Found one resource");
});

test("byPath: exclude with unused negation", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.a/webapp",
		virBasePath: "/resources/app/",
		excludes: [
			"!/resources/app/index.html",
			"/resources/app/**"
		]
	});

	const resource = await readerWriter.byPath("/resources/app/index.html", {nodir: true});
	t.truthy(resource, "Found one resource");
});

test("byPath: exclude with unused negation", async (t) => {
	const readerWriter = resourceFactory.createAdapter({
		fsBasePath: "./test/fixtures/application.b/webapp",
		virBasePath: "/resources/app/",
		excludes: [
			"!/resources/app/i18n/**",
			"/resources/app/**",
			"!/resources/app/manifest.json"
		]
	});

	const [manifest, i18n, i18ni18n] = await Promise.all([
		readerWriter.byPath("/resources/app/manifest.json", {nodir: true}),
		readerWriter.byPath("/resources/app/i18n.properties", {nodir: true}),
		readerWriter.byPath("/resources/app/i18n/i18n.properties", {nodir: true})
	]);
	t.truthy(manifest, "Found manifest.json resource");
	t.falsy(i18n, "Found i18n resource");
	t.truthy(i18ni18n, "Found i18n in i18n directory resource");
});

test("generic exclude test", async (t) => {
	const micromatch = require("micromatch");

	const excludePatterns = [
		"!/resources/app/fileA",
		"/resources/app/**",
	];

	const fileAPath = "/resources/app/fileA";
	const fileBPath = "/resources/app/fileB";

	let matches = micromatch(fileAPath, excludePatterns);
	t.deepEqual(matches.length, 0, "File A is excluded");

	matches = micromatch(fileBPath, excludePatterns);
	t.deepEqual(matches.length, 1, "File B is included");
});

test("generic exclude test 2", async (t) => {
	const micromatch = require("micromatch");

	const excludePatterns = [
		"/resources/app/**",
		"!/resources/app/fileA",
	];

	const fileAPath = "/resources/app/fileA";
	const fileBPath = "/resources/app/fileB";

	let matches = micromatch(fileAPath, excludePatterns);
	t.deepEqual(matches.length, 0, "File A is excluded");

	matches = micromatch(fileBPath, excludePatterns);
	t.deepEqual(matches.length, 1, "File B is included");
});


test("generic exclude test 3", async (t) => {
	const micromatch = require("micromatch");

	const excludePatterns = [
		"!/resources/app/i18n/**",
		"/resources/app/**",
		"!/resources/app/manifest.json"
	];

	const paths = [
		"/resources/app/manifest.json",
		"/resources/app/i18n.properties",
		"/resources/app/i18n/i18n.properties"
	];

	const matches = micromatch(paths, excludePatterns);
	t.deepEqual(matches, [
		"/resources/app/i18n.properties"
	], "Top level i18n.properties file is excluded");
});

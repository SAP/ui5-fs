import test from "ava";
import {createRequire} from "node:module";

// Using CommonsJS require since JSON module imports are still experimental
const require = createRequire(import.meta.url);

// package.json should be exported to allow reading version (e.g. from @ui5/cli)
test("export of package.json", (t) => {
	t.truthy(require("@ui5/fs/package.json").version);
});

// Check number of definied exports
test("check number of exports", (t) => {
	const packageJson = require("@ui5/fs/package.json");
	t.is(Object.keys(packageJson.exports).length, 12);
});

// Public API contract (exported modules)
[
	{
		exportedSpecifier: "@ui5/fs/adapters/AbstractAdapter",
		mappedModule: "../../src/adapters/AbstractAdapter.js",
	},
	{
		exportedSpecifier: "@ui5/fs/adapters/FileSystem",
		mappedModule: "../../src/adapters/FileSystem.js",
	},
	{
		exportedSpecifier: "@ui5/fs/adapters/Memory",
		mappedModule: "../../src/adapters/Memory.js",
	},
	{
		exportedSpecifier: "@ui5/fs/AbstractReader",
		mappedModule: "../../src/AbstractReader.js",
	},
	{
		exportedSpecifier: "@ui5/fs/AbstractReaderWriter",
		mappedModule: "../../src/AbstractReaderWriter.js",
	},
	{
		exportedSpecifier: "@ui5/fs/DuplexCollection",
		mappedModule: "../../src/DuplexCollection.js",
	},
	{
		exportedSpecifier: "@ui5/fs/fsInterface",
		mappedModule: "../../src/fsInterface.js",
	},
	{
		exportedSpecifier: "@ui5/fs/ReaderCollection",
		mappedModule: "../../src/ReaderCollection.js",
	},
	{
		exportedSpecifier: "@ui5/fs/ReaderCollectionPrioritized",
		mappedModule: "../../src/ReaderCollectionPrioritized.js",
	},
	{
		exportedSpecifier: "@ui5/fs/readers/Filter",
		mappedModule: "../../src/readers/Filter.js",
	},
	{
		exportedSpecifier: "@ui5/fs/readers/Link",
		mappedModule: "../../src/readers/Link.js",
	},
	{
		exportedSpecifier: "@ui5/fs/Resource",
		mappedModule: "../../src/Resource.js",
	},
	{
		exportedSpecifier: "@ui5/fs/resourceFactory",
		mappedModule: "../../src/resourceFactory.js",
	},
	// Internal modules (only to be used by @ui5/* packages)
	{
		exportedSpecifier: "@ui5/fs/internal/ResourceTagCollection",
		mappedModule: "../../src/ResourceTagCollection.js",
	},
].forEach(({exportedSpecifier, mappedModule}) => {
	test(`${exportedSpecifier}`, async (t) => {
		const actual = await import(exportedSpecifier);
		const expected = await import(mappedModule);
		t.is(actual, expected, "Correct module exported");
	});
});

import test from "ava";
import {createRequire} from "node:module";

// Using CommonsJS require as importing json files causes an ExperimentalWarning
const require = createRequire(import.meta.url);

// package.json should be exported to allow reading version (e.g. from @ui5/cli)
test("export of package.json", (t) => {
	t.truthy(require("@ui5/fs/package.json").version);
});

// Public API contract (exported modules)
[
	{
		exportedSpecifier: "@ui5/fs/adapters/AbstractAdapter",
		mappedModule: "../../lib/adapters/AbstractAdapter.js"
	},
	{
		exportedSpecifier: "@ui5/fs/adapters/FileSystem",
		mappedModule: "../../lib/adapters/FileSystem.js"
	},
	{
		exportedSpecifier: "@ui5/fs/adapters/Memory",
		mappedModule: "../../lib/adapters/Memory.js"
	},
	{
		exportedSpecifier: "@ui5/fs/AbstractReader",
		mappedModule: "../../lib/AbstractReader.js"
	},
	{
		exportedSpecifier: "@ui5/fs/AbstractReaderWriter",
		mappedModule: "../../lib/AbstractReaderWriter.js"
	},
	{
		exportedSpecifier: "@ui5/fs/DuplexCollection",
		mappedModule: "../../lib/DuplexCollection.js"
	},
	{
		exportedSpecifier: "@ui5/fs/fsInterface",
		mappedModule: "../../lib/fsInterface.js"
	},
	{
		exportedSpecifier: "@ui5/fs/ReaderCollection",
		mappedModule: "../../lib/ReaderCollection.js"
	},
	{
		exportedSpecifier: "@ui5/fs/ReaderCollectionPrioritized",
		mappedModule: "../../lib/ReaderCollectionPrioritized.js"
	},
	{
		exportedSpecifier: "@ui5/fs/Resource",
		mappedModule: "../../lib/Resource.js"
	},
	{
		exportedSpecifier: "@ui5/fs/ResourceTagCollection",
		mappedModule: "../../lib/ResourceTagCollection.js"
	},
	{
		exportedSpecifier: "@ui5/fs/resourceFactory",
		mappedModule: "../../lib/resourceFactory.js"
	},
].forEach(({exportedSpecifier, mappedModule}) => {
	test(`${exportedSpecifier}`, async (t) => {
		const actual = await import(exportedSpecifier);
		const expected = await import(mappedModule);
		t.is(actual, expected, "Correct module exported");
	});
});

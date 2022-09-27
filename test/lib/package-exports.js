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
	"@ui5/fs/adapters/AbstractAdapter",
	"@ui5/fs/adapters/FileSystem",
	"@ui5/fs/adapters/Memory",
	"@ui5/fs/AbstractReader",
	"@ui5/fs/AbstractReaderWriter",
	"@ui5/fs/DuplexCollection",
	"@ui5/fs/fsInterface",
	"@ui5/fs/ReaderCollection",
	"@ui5/fs/ReaderCollectionPrioritized",
	"@ui5/fs/Resource",
	"@ui5/fs/ResourceTagCollection",
	"@ui5/fs/resourceFactory",
].forEach((specifier) => {
	test(`export of ${specifier}`, async (t) => {
		t.truthy(await import(specifier), "Module exported");
	});
});

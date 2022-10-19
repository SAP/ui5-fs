import test from "ava";
import {createAdapter} from "../../../lib/resourceFactory.js";

test("_migrateResource", async (t) => {
	const resource = {
		_path: "/test.js"
	};

	const writer = createAdapter({
		virBasePath: "/"
	});

	const migratedResource = await writer._migrateResource(resource);

	t.is(migratedResource.getPath(), "/test.js");
});

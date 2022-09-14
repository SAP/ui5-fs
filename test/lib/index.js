import test from "ava";
import index from "../../index.js";
const {adapters, AbstractReader, AbstractReaderWriter, DuplexCollection,
	fsInterface, ReaderCollection, ReaderCollectionPrioritized,
	Resource, ResourceTagCollection, resourceFactory} = index;

test("index.js exports all expected modules", (t) => {
	t.truthy(adapters.AbstractAdapter, "Module exported");
	t.truthy(adapters.FileSystem, "Module exported");
	t.truthy(adapters.Memory, "Module exported");

	t.truthy(AbstractReader, "Module exported");
	t.truthy(AbstractReaderWriter, "Module exported");
	t.truthy(DuplexCollection, "Module exported");
	t.truthy(fsInterface, "Module exported");
	t.truthy(ReaderCollection, "Module exported");
	t.truthy(ReaderCollectionPrioritized, "Module exported");
	t.truthy(Resource, "Module exported");
	t.truthy(ResourceTagCollection, "Module exported");
	t.truthy(resourceFactory, "Module exported");
});

import AbstractAdapter from "./lib/adapters/AbstractAdapter.js";
import FileSystem from "./lib/adapters/FileSystem.js";
import Memory from "./lib/adapters/Memory.js";
import Filter from "./lib/readers/Filter.js";
import Transformer from "./lib/readers/Transformer.js";
import AbstractReader from "./lib/AbstractReader.js";
import AbstractReaderWriter from "./lib/AbstractReaderWriter.js";
import DuplexCollection from "./lib/DuplexCollection.js";
import fsInterface from "./lib/fsInterface.js";
import ReaderCollection from "./lib/ReaderCollection.js";
import ReaderCollectionPrioritized from "./lib/ReaderCollectionPrioritized.js";
import Resource from "./lib/Resource.js";
import ResourceTagCollection from "./lib/ResourceTagCollection.js";
import resourceFactory from "./lib/resourceFactory.js";

/**
 * @module @ui5/fs
 * @public
 */
export default {
	/**
	 * @public
	 * @alias module:@ui5/fs.adapters
	 * @namespace
	 */
	adapters: {
		/**
		 * @type {typeof import('./lib/adapters/AbstractAdapter')}
		 */
		AbstractAdapter,
		/**
		 * @type {typeof import('./lib/adapters/FileSystem')}
		 */
		FileSystem,
		/**
		 * @type {typeof import('./lib/adapters/Memory')}
		 */
		Memory
	},
	/**
	 * @public
	 * @alias module:@ui5/fs.readers
	 * @namespace
	 */
	readers: {
		/**
		 * @type {typeof import('./lib/readers/Filter')}
		 */
		Filter,
		/**
		 * @type {typeof import('./lib/readers/Transformer')}
		 */
		Transformer
	},
	/**
	 * @type {typeof import('./lib/AbstractReader')}
	 */
	AbstractReader,
	/**
	 * @type {typeof import('./lib/AbstractReaderWriter')}
	 */
	AbstractReaderWriter,
	/**
	 * @type {typeof import('./lib/DuplexCollection')}
	 */
	DuplexCollection,
	/**
	 * @type {import('./lib/fsInterface')}
	 */
	fsInterface,
	/**
	 * @type {typeof import('./lib/ReaderCollection')}
	 */
	ReaderCollection,
	/**
	 * @type {typeof import('./lib/ReaderCollectionPrioritized')}
	 */
	ReaderCollectionPrioritized,
	/**
	 * @type {typeof import('./lib/Resource')}
	 */
	Resource,
	/**
	 * @type {typeof import('./lib/ResourceTagCollection')}
	 */
	ResourceTagCollection,
	/**
	 * @type {import('./lib/resourceFactory')}
	 */
	resourceFactory
};

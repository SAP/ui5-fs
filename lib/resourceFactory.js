import path from "node:path";
import minimatch from "minimatch";
import DuplexCollection from "./DuplexCollection.js";
import FileSystem from "./adapters/FileSystem.js";
import MemAdapter from "./adapters/Memory.js";
import ReaderCollection from "./ReaderCollection.js";
import ReaderCollectionPrioritized from "./ReaderCollectionPrioritized.js";
import Resource from "./Resource.js";
import WriterCollection from "./WriterCollection.js";

/**
 * @module @ui5/fs/resourceFactory
 * @description
 * @public
 */

/**
 * Creates a resource <code>ReaderWriter</code>.
 *
 * If a file system base path is given, file system resource <code>ReaderWriter</code> is returned.
 * In any other case a virtual one.
 *
 * @public
 * @param {object} parameters Parameters
 * @param {string} parameters.virBasePath Virtual base path
 * @param {string} [parameters.fsBasePath] File system base path
 * @param {string[]} [parameters.excludes] List of glob patterns to exclude
 * @param {object} [parameters.project] Experimental, internal parameter. Do not use
 * @returns {module:@ui5/fs/adapters.FileSystem|module:@ui5/fs/adapters.Memory} File System- or Virtual Adapter
 */
export function createAdapter({fsBasePath, virBasePath, project, excludes}) {
	if (fsBasePath) {
		const FsAdapter = FileSystem;
		return new FsAdapter({fsBasePath, virBasePath, project, excludes});
	} else {
		return new MemAdapter({virBasePath, project, excludes});
	}
}

/**
 * Creates an adapter and wraps it in a ReaderCollection
 *
 * @public
 * @param {object} parameters Parameters
 * @param {string} parameters.virBasePath Virtual base path
 * @param {string} parameters.fsBasePath File system base path
 * @param {object} [parameters.project] Experimental, internal parameter. Do not use
 * @param {string[]} [parameters.excludes] List of glob patterns to exclude
 * @param {string} [parameters.name]  Name for the reader collection
 * @returns {module:@ui5/fs/ReaderCollection} Reader collection wrapping an adapter
 */
export function createReader({fsBasePath, virBasePath, project, excludes = [], name}) {
	const normalizedExcludes = excludes.map((pattern) => {
		return prefixGlobPattern(pattern, virBasePath);
	});
	if (!fsBasePath) {
		// Creating a reader with a memory adapter seems pointless right now
		// since there would be no way to fill the adapter with resources
		throw new Error(`Missing parameter "fsBasePath"`);
	}
	return new ReaderCollection({
		name,
		readers: [createAdapter({
			fsBasePath,
			virBasePath,
			project,
			excludes: normalizedExcludes
		})]
	});
}

/**
 * Creates a ReaderCollection
 *
 * @public
 * @param {object} parameters Parameters
 * @param {string} parameters.name The collection name
 * @param {module:@ui5/fs/AbstractReader[]} parameters.readers List of resource readers (all tried in parallel)
 * @returns {module:@ui5/fs/ReaderCollection} Reader collection wrapping provided readers
 */
export function createReaderCollection({name, readers}) {
	return new ReaderCollection({
		name,
		readers
	});
}

/**
 * Creates a ReaderCollection
 *
 * @public
 * @param {object} parameters
 * @param {string} parameters.name The collection name
 * @param {module:@ui5/fs/AbstractReader[]} parameters.readers Prioritized list of resource readers
 * 																(first is tried first)
 * @returns {module:@ui5/fs/ReaderCollectionPrioritized} Reader collection wrapping provided readers
 */
export function createReaderCollectionPrioritized({name, readers}) {
	return new ReaderCollectionPrioritized({
		name,
		readers
	});
}

// TODO: Fix jsdoc
/**
 *
 * @param {object} parameters
 * @param {string} parameters.name
 * @param {object} parameters.writerMapping
 */
export function createWriterCollection({name, writerMapping}) {
	return new WriterCollection({
		name,
		writerMapping
	});
}

/**
 * Creates a <code>Resource</code>. Accepts the same parameters as the Resource constructor.
 *
 * @public
 * @param {object} parameters Parameters to be passed to the resource constructor
 * @returns {module:@ui5/fs/Resource} Resource
 */
export function createResource(parameters) {
	return new Resource(parameters);
}

/**
 * Creates a Workspace
 *
 * A workspace is a DuplexCollection which reads from the project sources. It is used during the build process
 * to write modified files into a separate writer, this is usually a Memory adapter. If a file already exists it is
 * fetched from the memory to work on it in further build steps.
 *
 * @public
 * @param {object} parameters
 * @param {module:@ui5/fs/AbstractReader} parameters.reader Single reader or collection of readers
 * @param {module:@ui5/fs/AbstractReaderWriter} [parameters.writer] A ReaderWriter instance which is
 *        only used for writing files. If not supplied, a Memory adapter will be created.
 * @param {string} [parameters.name="vir & fs source"] Name of the collection
 * @param {string} [parameters.virBasePath="/"] Virtual base path
 * @returns {module:@ui5/fs/DuplexCollection} DuplexCollection which wraps the provided resource locators
 */
export function createWorkspace({reader, writer, virBasePath = "/", name = "vir & fs source"}) {
	if (!writer) {
		writer = new MemAdapter({
			virBasePath
		});
	}

	return new DuplexCollection({
		reader,
		writer,
		name
	});
}

/**
 * Normalizes virtual glob patterns by prefixing them with
 * a given virtual base directory path
 *
 * @param {string} virPattern glob pattern for virtual directory structure
 * @param {string} virBaseDir virtual base directory path to prefix the given patterns with
 * @returns {string[]} A list of normalized glob patterns
 */
export function prefixGlobPattern(virPattern, virBaseDir) {
	const mm = new minimatch.Minimatch(virPattern);

	const resultGlobs = [];
	for (let i = 0; i < mm.globSet.length; i++) {
		let resultPattern = path.posix.join(virBaseDir, mm.globSet[i]);

		if (mm.negate) {
			resultPattern = "!" + resultPattern;
		}
		resultGlobs.push(resultPattern);
	}
	return Array.prototype.concat.apply([], resultGlobs);
}

import path from "node:path";
import {minimatch} from "minimatch";
import DuplexCollection from "./DuplexCollection.js";
import FsAdapter from "./adapters/FileSystem.js";
import MemAdapter from "./adapters/Memory.js";
import ReaderCollection from "./ReaderCollection.js";
import ReaderCollectionPrioritized from "./ReaderCollectionPrioritized.js";
import Resource, {Resource_Options, ResourceInterface} from "./Resource.js";
import WriterCollection from "./WriterCollection.js";
import Filter, {Filter_Params} from "./readers/Filter.js";
import Link, {Link_Args} from "./readers/Link.js";
import {getLogger} from "@ui5/logger";
import {Project} from "@ui5/project/specifications/Project";
import AbstractReader from "./AbstractReader.js";
import AbstractReaderWriter from "./AbstractReaderWriter.js";
const log = getLogger("resources:resourceFactory");

/**
 * @module @ui5/fs/resourceFactory
 * @description A collection of resource related APIs
 */

/**
 * Creates a resource <code>ReaderWriter</code>.
 *
 * If a file system base path is given, file system resource <code>ReaderWriter</code> is returned.
 * In any other case a virtual one.
 *
 * @param parameters Parameters
 * @param parameters.virBasePath Virtual base path. Must be absolute, POSIX-style, and must end with a slash
 * @param [parameters.fsBasePath]
 *   File System base path.
 *   If this parameter is supplied, a File System adapter will be created instead of a Memory adapter.
 *   The provided path must be absolute and must use platform-specific path segment separators.
 * @param [parameters.excludes] List of glob patterns to exclude
 * @param [parameters.useGitignore]
 *   Whether to apply any excludes defined in an optional .gitignore in the base directory.
 *   This parameter only takes effect in conjunction with the <code>fsBasePath</code> parameter.
 * @param [parameters.project] Project this adapter belongs to (if any)
 * @returns File System- or Virtual Adapter
 */
export function createAdapter({fsBasePath, virBasePath, project, excludes, useGitignore}:
{fsBasePath?: string; virBasePath: string; project?: Project; excludes?: string[]; useGitignore?: boolean}
) {
	if (fsBasePath) {
		return new FsAdapter({fsBasePath, virBasePath, project, excludes, useGitignore});
	} else {
		return new MemAdapter({virBasePath, project, excludes});
	}
}

/**
 * Creates a File System adapter and wraps it in a ReaderCollection
 *
 * @param parameters Parameters
 * @param parameters.virBasePath Virtual base path. Must be absolute, POSIX-style, and must end with a slash
 * @param parameters.fsBasePath
 *   File System base path. Must be absolute and must use platform-specific path segment separators
 * @param [parameters.project] Experimental, internal parameter. Do not use
 * @param [parameters.excludes] List of glob patterns to exclude
 * @param [parameters.name] Name for the reader collection
 * @returns Reader collection wrapping an adapter
 */
export function createReader({fsBasePath, virBasePath, project, excludes = [], name}:
{fsBasePath: string; virBasePath: string; project?: Project; excludes?: string[]; name?: string}
) {
	if (!fsBasePath) {
		// Creating a reader with a memory adapter seems pointless right now
		// since there would be no way to fill the adapter with resources
		throw new Error(`Unable to create reader: Missing parameter "fsBasePath"`);
	}
	let normalizedExcludes = excludes;
	// If a project is supplied, and that project is of type application,
	// Prefix all exclude patterns with the virtual base path (unless it already starts with that)
	// TODO 4.0: // TODO specVersion 4.0: Disallow excludes without namespaced prefix in configuration
	// Specifying an exclude for "/test" is disambigous as it neither reflects the source path nor the
	// ui5 runtime path of the excluded resources. Therefore, only allow paths like /resources/<namespace>/test
	// starting with specVersion 4.0
	if (excludes.length && project && project.getType() === "application") {
		const nestedNormalizedExcludes = excludes.map((pattern) => {
			if (pattern.startsWith(virBasePath) || pattern.startsWith("!" + virBasePath)) {
				return pattern;
			}
			log.verbose(
				`Prefixing exclude pattern defined in application project ${project.getName()}: ${pattern}`);
			return prefixGlobPattern(pattern, virBasePath);
		});
		// Flatten list of patterns
		normalizedExcludes = Array.prototype.concat.apply([], nestedNormalizedExcludes) as string[];
		log.verbose(`Effective exclude patterns for application project ${project.getName()}:\n` +
		normalizedExcludes.join(", "));
	}
	return new ReaderCollection({
		name,
		readers: [createAdapter({
			fsBasePath,
			virBasePath,
			project,
			excludes: normalizedExcludes,
		})],
	});
}

/**
 * Creates a ReaderCollection
 *
 * @param parameters Parameters
 * @param parameters.name The collection name
 * @param parameters.readers List of resource readers (all tried in parallel)
 * @returns Reader collection wrapping provided readers
 */
export function createReaderCollection({name, readers}: {name: string; readers: AbstractReader[]}) {
	return new ReaderCollection({
		name,
		readers,
	});
}

/**
 * Creates a ReaderCollectionPrioritized
 *
 * @param parameters Parameters
 * @param parameters.name The collection name
 * @param parameters.readers Prioritized list of resource readers
 * 																(first is tried first)
 * @returns Reader collection wrapping provided readers
 */
export function createReaderCollectionPrioritized({name, readers}: {name: string; readers: AbstractReader[]}) {
	return new ReaderCollectionPrioritized({
		name,
		readers,
	});
}

/**
 * Creates a WriterCollection
 *
 * @param parameters Parameters
 * @param parameters.name The collection name
 * @param parameters.writerMapping Mapping of virtual base
 * 	paths to writers. Path are matched greedy
 * @returns Writer collection wrapping provided writers
 */
export function createWriterCollection({name, writerMapping}: {name: string; writerMapping: AbstractReaderWriter[]}) {
	return new WriterCollection({
		name,
		writerMapping,
	});
}

/**
 * Creates a [Resource]{@link @ui5/fs/Resource}.
 * Accepts the same parameters as the [Resource]{@link @ui5/fs/Resource} constructor.
 *
 * @param parameters Parameters to be passed to the resource constructor
 * @returns Resource
 */
export function createResource(parameters: Resource_Options): ResourceInterface {
	return new Resource(parameters);
}

/**
 * Creates a Workspace
 *
 * A workspace is a DuplexCollection which reads from the project sources. It is used during the build process
 * to write modified files into a separate writer, this is usually a Memory adapter. If a file already exists it is
 * fetched from the memory to work on it in further build steps.
 *
 * @param parameters Parameters
 * @param parameters.reader Single reader or collection of readers
 * @param [parameters.writer] A ReaderWriter instance which is
 *        only used for writing files. If not supplied, a Memory adapter will be created.
 * @param [parameters.name] Name of the collection
 * @param [parameters.virBasePath] Virtual base path
 * @returns DuplexCollection which wraps the provided resource locators
 */
export function createWorkspace({reader, writer, virBasePath = "/", name = "workspace"}:
{reader: AbstractReader; writer?: AbstractReaderWriter; virBasePath?: string; name?: string}
) {
	if (!writer) {
		writer = new MemAdapter({
			virBasePath,
		});
	}

	return new DuplexCollection({
		reader,
		writer,
		name,
	});
}

/**
 * Create a [Filter-Reader]{@link @ui5/fs/readers/Filter} with the given reader.
 * The provided callback is called for every resource that is retrieved through the
 * reader and decides whether the resource shall be passed on or dropped.
 *
 * @param parameters Parameters
 * @param parameters.reader Single reader or collection of readers
 * @param parameters.callback
 * 				Filter function. Will be called for every resource passed through this reader.
 * @returns Reader instance
 */
export function createFilterReader(parameters: Filter_Params) {
	return new Filter(parameters);
}

/**
 * Create a [Link-Reader]{@link @ui5/fs/readers/Filter} with the given reader.
 * The provided path mapping allows for rewriting paths segments of all resources passed through it.
 *
 * @example
 * import {createLinkReader} from "@ui5/fs/resourceFactory";
 * const linkedReader = createLinkReader({
 *     reader: sourceReader,
 *     pathMapping: {
 *          linkPath: `/app`,
 *          targetPath: `/resources/my-app-name/`
 *      }
 * });
 *
 * // The following resolves with a @ui5/fs/ResourceFacade of the resource
 * // located at "/resources/my-app-name/Component.js" in the sourceReader
 * const resource = await linkedReader.byPath("/app/Component.js");
 *
 * @param parameters Parameters
 * @param parameters.reader Single reader or collection of readers
 * @param parameters.pathMapping Path mapping for a [Link]{@link @ui5/fs/readers/Link}
 * @param parameters.pathMapping.linkPath Path to match and replace in the requested path or pattern
 * @param parameters.pathMapping.targetPath Path to use as a replacement in the request for the source reader
 * @returns Reader instance
 */
export function createLinkReader(parameters: Link_Args) {
	return new Link(parameters);
}

/**
 * Create a [Link-Reader]{@link @ui5/fs/readers/Link} where all requests are prefixed with
 * <code>/resources/<namespace></code>.
 *
 * This simulates "flat" resource access, which is for example common for projects of type
 * "application".
 *
 * @param parameters Parameters
 * @param parameters.reader Single reader or collection of readers
 * @param parameters.namespace Project namespace
 * @returns Reader instance
 */
export function createFlatReader({reader, namespace}: {reader: AbstractReader; namespace: string}) {
	return new Link({
		reader: reader,
		pathMapping: {
			linkPath: `/`,
			targetPath: `/resources/${namespace}/`,
		},
	});
}

/**
 * Normalizes virtual glob patterns by prefixing them with
 * a given virtual base directory path
 *
 * @param virPattern glob pattern for virtual directory structure
 * @param virBaseDir virtual base directory path to prefix the given patterns with
 * @returns A list of normalized glob patterns
 */
export function prefixGlobPattern(virPattern: string, virBaseDir: string): string[] {
	const mm = new minimatch.Minimatch(virPattern);

	const resultGlobs = [];
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < mm.globSet.length; i++) {
		let resultPattern = path.posix.join(virBaseDir, mm.globSet[i]);

		if (mm.negate) {
			resultPattern = "!" + resultPattern;
		}
		resultGlobs.push(resultPattern);
	}
	return resultGlobs;
}

import AbstractReaderWriter from "./AbstractReaderWriter.js";
import ReaderCollection from "./ReaderCollection.js";
import escapeStringRegExp from "escape-string-regexp";
import Trace from "./tracing/Trace.js";
import Resource from "./Resource.js";

/**
 * Resource Locator WriterCollection
 *
 * @alias @ui5/fs/WriterCollection
 */
class WriterCollection extends AbstractReaderWriter {
	_basePathRegex: string;
	_writerMapping: Record<string, AbstractReaderWriter>;
	_readerCollection: ReaderCollection;

	/**
	 * The constructor.
	 *
	 * @param parameters Parameters
	 * @param parameters.name The collection name
	 * @param parameters.writerMapping
	 * 	Mapping of virtual base paths to writers. Path are matched greedy
	 *
	 * @example
	 * new WriterCollection({
	 *     name: "Writer Collection",
	 *     writerMapping: {
	 *	       "/": writerA,
	 *	       "/my/path/": writerB,
	 *     }
	 * });
	 */
	constructor({name, writerMapping}: {name: string; writerMapping: Record<string, AbstractReaderWriter>}) {
		super(name);

		if (!writerMapping) {
			throw new Error(`Cannot create WriterCollection ${this._name}: Missing parameter 'writerMapping'`);
		}
		const basePaths = Object.keys(writerMapping);
		if (!basePaths.length) {
			throw new Error(`Cannot create WriterCollection ${this._name}: Empty parameter 'writerMapping'`);
		}

		// Create a regular expression (which is greedy by nature) from all paths to easily
		//	find the correct writer for any given resource path
		this._basePathRegex = basePaths.sort().reduce((regex, basePath) => {
			// Validate base path
			if (!basePath) {
				throw new Error(`Empty path in path mapping of WriterCollection ${this._name}`);
			}
			if (!basePath.startsWith("/")) {
				throw new Error(
					`Missing leading slash in path mapping '${basePath}' of WriterCollection ${this._name}`);
			}
			if (!basePath.endsWith("/")) {
				throw new Error(
					`Missing trailing slash in path mapping '${basePath}' of WriterCollection ${this._name}`);
			}

			return `${regex}(?:${escapeStringRegExp(basePath)})??`;
		}, "^(") + ")+.*?$";

		this._writerMapping = writerMapping;
		this._readerCollection = new ReaderCollection({
			name: `Reader collection of writer collection '${this._name}'`,
			readers: Object.values(writerMapping),
		});
	}

	/**
	 * Locates resources by glob.
	 *
	 * @param pattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param options glob options
	 * @param options.nodir Do not match directories
	 * @param trace Trace instance
	 * @returns Promise resolving to list of resources
	 */
	_byGlob(pattern: string | string[], options: {nodir: boolean}, trace: Trace) {
		return this._readerCollection._byGlob(pattern, options, trace);
	}

	/**
	 * Locates resources by path.
	 *
	 * @param virPath Virtual path
	 * @param options Options
	 * @param options.nodir Do not match directories
	 * @param trace Trace instance
	 * @returns Promise resolving to a single resource
	 */
	_byPath(virPath: string, options: {nodir: boolean}, trace: Trace) {
		return this._readerCollection._byPath(virPath, options, trace);
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @param resource The Resource to write
	 * @param [options] Write options, see above
	 * @param [options.drain]
	 * @param [options.readOnly]
	 * @returns Promise resolving once data has been written
	 */
	_write(resource: Resource, options?: {drain?: boolean; readOnly?: boolean}) {
		const resourcePath = resource.getPath();

		const basePathMatch = resourcePath.match(this._basePathRegex);
		if (!basePathMatch || basePathMatch.length < 2) {
			throw new Error(
				`Failed to find a writer for resource with path ${resourcePath} in WriterCollection ${this._name}. ` +
				`Base paths handled by this collection are: ${Object.keys(this._writerMapping).join(", ")}`);
		}
		const writer = this._writerMapping[basePathMatch[1]];
		return writer._write(resource, options);
	}
}

export default WriterCollection;

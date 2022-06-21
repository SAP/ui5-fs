const AbstractReaderWriter = require("./AbstractReaderWriter");
const ReaderCollection = require("./ReaderCollection");
const escapeStringRegExp = require("escape-string-regexp");

/**
 * Resource Locator WriterCollection
 *
 * @public
 * @memberof module:@ui5/fs
 * @augments module:@ui5/fs.AbstractReaderWriter
 */
class WriterCollection extends AbstractReaderWriter {
	/**
	 * The constructor.
	 *
	 * @param {object} parameters Parameters
	 * @param {Array<object.<string, module:@ui5/fs.AbstractReaderWriter>>} parameters.writerMapping
	 * 	Mapping of virtual base paths to writers. Path are matched greedy
	 * @param {string} parameters.name The collection name
	 */
	constructor({writerMapping, name}) {
		super();
		this._name = name;

		if (!writerMapping) {
			throw new Error("Missing parameter 'writerMapping'");
		}
		const basePaths = Object.keys(writerMapping);
		if (!basePaths.length) {
			throw new Error("Empty parameter 'writerMapping'");
		}

		// Create a regular expression (which is greedy by nature) from all paths to easily
		//	find the correct writer for any given resource path
		this._basePathRegex = basePaths.sort().reduce((regex, basePath, idx) => {
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
			readers: Object.values(writerMapping)
		});
	}

	/**
	 * Locates resources by glob.
	 *
	 * @private
	 * @param {string|string[]} pattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param {object} options glob options
	 * @param {module:@ui5/fs.tracing.Trace} trace Trace instance
	 * @returns {Promise<module:@ui5/fs.Resource[]>} Promise resolving to list of resources
	 */
	_byGlob(pattern, options, trace) {
		return this._readerCollection._byGlob(pattern, options, trace);
	}

	/**
	 * Locates resources by path.
	 *
	 * @private
	 * @param {string} virPath Virtual path
	 * @param {object} options Options
	 * @param {module:@ui5/fs.tracing.Trace} trace Trace instance
	 * @returns {Promise<module:@ui5/fs.Resource>} Promise resolving to a single resource
	 */
	_byPath(virPath, options, trace) {
		return this._readerCollection._byPath(virPath, options, trace);
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @private
	 * @param {module:@ui5/fs.Resource} resource The Resource to write
	 * @param {object} [options] Write options, see above
	 * @returns {Promise<undefined>} Promise resolving once data has been written
	 */
	_write(resource, options) {
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

	_validateBasePath(writerMapping) {
		Object.keys(writerMapping).forEach((path) => {
			if (!path) {
				throw new Error(`Empty path in path mapping of WriterCollection ${this._name}`);
			}
			if (!path.startsWith("/")) {
				throw new Error(`Missing leading slash in path mapping '${path}' of WriterCollection ${this._name}`);
			}
			if (!path.endsWith("/")) {
				throw new Error(`Missing trailing slash in path mapping '${path}' of WriterCollection ${this._name}`);
			}
		});
	}
}

module.exports = WriterCollection;
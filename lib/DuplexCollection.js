const AbstractReaderWriter = require("./AbstractReaderWriter");
const ReaderCollectionPrioritized = require("./ReaderCollectionPrioritized");

/**
 * Wrapper to keep readers and writers together
 *
 * @public
 * @memberof module:@ui5/fs
 * @augments module:@ui5/fs.AbstractReaderWriter
 */
class DuplexCollection extends AbstractReaderWriter {
	/**
	 * The Constructor.
	 *
	 * @param {Object} parameters
	 * @param {module:@ui5/fs.AbstractReader} parameters.reader Single reader or collection of readers
	 * @param {module:@ui5/fs.AbstractReaderWriter} parameters.writer A ReaderWriter instance which is only used for writing files
	 * @param {string} [parameters.name=""] The collection name
	 */
	constructor({reader, writer, name = ""}) {
		super();
		this._reader = reader;
		this._writer = writer;

		this._combo = new ReaderCollectionPrioritized({
			name: name,
			readers: [
				writer,
				reader
			]
		});
	}

	/**
	 * Locates resources by glob.
	 *
	 * @private
	 * @param {string|string[]} virPattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param {Object} options glob options
	 * @param {module:@ui5/fs.tracing.Trace} trace Trace instance
	 * @returns {Promise<module:@ui5/fs.Resource[]>} Promise resolving with a list of resources
	 */
	_byGlob(virPattern, options, trace) {
		return this._combo._byGlob(virPattern, options, trace);
	}

	/**
	 * Locates resources by glob from source reader only.
	 * For found resources that are also available in the writer, the writer resource will be returned.
	 *
	 * @param {string} virPattern glob pattern for virtual directory structure
	 * @param {Object} [options] glob options
	 * @param {boolean} [options.nodir=true] Do not match directories
	 * @returns {Promise<module:@ui5/fs.Resource[]>} Promise resolving to list of resources
	 */
	byGlobSource(virPattern, options = {nodir: true}) {
		return this._reader.byGlob(virPattern, options).then((resources) => {
			return Promise.all(resources.map((readerResource) => {
				return this._writer.byPath(readerResource.getPath()).then((writerResource) => {
					return writerResource || readerResource;
				});
			}));
		});
	}

	/**
	 * Locates resources by path.
	 *
	 * @private
	 * @param {string} virPath Virtual path
	 * @param {Object} options Options
	 * @param {module:@ui5/fs.tracing.Trace} trace Trace instance
	 * @returns {Promise<module:@ui5/fs.Resource>} Promise resolving to a single resource
	 */
	_byPath(virPath, options, trace) {
		return this._combo._byPath(virPath, options, trace);
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @private
	 * @param {module:@ui5/fs.Resource} resource The Resource to write
	 * @returns {Promise<undefined>} Promise resolving once data has been written
	 */
	_write(resource) {
		return this._writer.write(resource);
	}
}

module.exports = DuplexCollection;

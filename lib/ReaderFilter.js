const AbstractReader = require("./AbstractReader");

/**
 * Resource Locator ReaderCollection
 *
 * @public
 * @memberof module:@ui5/fs
 * @augments module:@ui5/fs.AbstractReader
 */
class ReaderFilter extends AbstractReader {
	/**
	 * The constructor.
	 *
	 * @param {object} parameters Parameters
	 * @param {module:@ui5/fs.AbstractReader} parameters.reader A resource reader
	 * @param {Function} parameters.filterCallback
	 * 			Filter function. Should return true for items to keep and false otherwise
	 */
	constructor({reader, filterCallback}) {
		super();
		if (!reader) {
			throw new Error(`Missing parameter "reader"`);
		}
		if (!filterCallback) {
			throw new Error(`Missing parameter "filterCallback"`);
		}
		this._reader = reader;
		this._filterCallback = filterCallback;
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
	async _byGlob(pattern, options, trace) {
		const result = await this._reader._byGlob(pattern, options, trace);
		return result.filter(this._filterCallback);
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
	async _byPath(virPath, options, trace) {
		const result = await this._reader._byPath(virPath, options, trace);
		if (result) {
			if (!this._filterCallback(result)) {
				return null;
			}
		}
		return result;
	}
}

module.exports = ReaderFilter;

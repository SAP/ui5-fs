const AbstractReader = require("../AbstractReader");

/**
 * Transparently apply filters on resource readers by wrapping them.
 *
 * @public
 * @memberof module:@ui5/fs.readers
 * @augments module:@ui5/fs.AbstractReader
 */
class Transformer extends AbstractReader {
	/**
	* Filter callback
	*
	* @public
	* @callback module:@ui5/fs.readers.Transformer~callback
	* @param {module:@ui5/fs.Resource} resource Resource to transform
	* @returns {Promise|undefined} Optional promise resolving once the resource has been transformed
	*/

	/**
	 * Constructor
	 *
	 * @param {object} parameters Parameters
	 * @param {module:@ui5/fs.AbstractReader} parameters.reader The resource reader to wrap
	 * @param {module:@ui5/fs.readers.Transformer~callback} parameters.callback
	 * 				Filter function. Will be called for every resource read through this reader.
	 */
	constructor({reader, callback}) {
		super();
		if (!reader) {
			throw new Error(`Missing parameter "reader"`);
		}
		if (!callback) {
			throw new Error(`Missing parameter "callback"`);
		}
		this._reader = reader;
		this._callback = callback;
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
		return Promise.all(result.map(async (resource) => {
			resource = await resource.clone();
			const res = this._callback(resource);
			if (res && res instanceof Promise) {
				await res;
			}
			return resource;
		}));
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
		let resource = await this._reader._byPath(virPath, options, trace);
		if (resource) {
			resource = await resource.clone();
			const res = this._callback(resource);
			if (res && res instanceof Promise) {
				await res;
			}
		}
		return resource;
	}
}

module.exports = Transformer;

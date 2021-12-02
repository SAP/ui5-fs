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
	 * @param {module:@ui5/fs.ResourceTagCollection} parameters.resourceTagCollection
	 * 			Resource tag collection to apply filters onto
	 * @param {object[]} parameters.filters Filters
	 * @param {string} parameters.matchMode Whether to match "any", "all" or "none"
	 */
	constructor({reader, resourceTagCollection, filters, matchMode}) {
		super();
		if (!reader) {
			throw new Error(`Missing parameter "reader"`);
		}
		if (!resourceTagCollection) {
			throw new Error(`Missing parameter "resourceTagCollection"`);
		}
		if (!filters || !filters.length) {
			throw new Error(`Missing parameter "filters"`);
		}
		if (!matchMode) {
			throw new Error(`Missing parameter "matchMode"`);
		}
		this._reader = reader;
		this._resourceTagCollection = resourceTagCollection;
		this._filters = filters;

		this._matchMode = matchMode;
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
		return result.filter(this._filterResource.bind(this));
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
			if (!this._filterResource(result)) {
				return null;
			}
		}
		return result;
	}

	_filterResource(resource) {
		let filterFunction;
		let testEquality = true;
		switch (this._matchMode) {
		case "any":
			filterFunction = "some";
			break;
		case "all":
			filterFunction = "every";
			break;
		case "none":
			filterFunction = "every";
			testEquality = false;
			break;
		default:
			throw Error(`Unknown match mode ${this._matchMode}`);
		}
		return this._filters[filterFunction](({tag, value: filterValue}) => {
			const tagValue = this._resourceTagCollection.getTag(resource, tag);
			if (testEquality) {
				return tagValue === filterValue;
			} else {
				return tagValue !== filterValue;
			}
		});
	}
}

module.exports = ReaderFilter;

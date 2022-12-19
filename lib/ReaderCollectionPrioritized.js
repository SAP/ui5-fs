import AbstractReader from "./AbstractReader.js";

/**
 * Prioritized Resource Locator Collection
 *
 * @public
 * @class
 * @alias @ui5/fs/ReaderCollectionPrioritized
 * @extends @ui5/fs/AbstractReader
 */
class ReaderCollectionPrioritized extends AbstractReader {
	/**
	 * The constructor.
	 *
	 * @param {object} parameters
	 * @param {string} parameters.name The collection name
	 * @param {@ui5/fs/AbstractReader[]} [parameters.readers]
	 *   Prioritized list of resource readers (tried in the order provided).
	 *   If none are provided, the collection will never return any results.
	 */
	constructor({readers, name}) {
		super(name);

		// Remove any undefined (empty) readers from array
		this._readers = readers.filter(($) => $);
	}

	/**
	 * Locates resources by glob.
	 *
	 * @private
	 * @param {string|string[]} pattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param {object} options glob options
	 * @param {@ui5/fs/tracing.Trace} trace Trace instance
	 * @returns {Promise<@ui5/fs/Resource[]>} Promise resolving to list of resources
	 */
	_byGlob(pattern, options, trace) {
		return Promise.all(this._readers.map(function(resourceLocator) {
			return resourceLocator._byGlob(pattern, options, trace);
		})).then((result) => {
			const files = Object.create(null);
			const resources = [];
			// Prefer files found in preceding resource locators
			for (let i = 0; i < result.length; i++) {
				for (let j = 0; j < result[i].length; j++) {
					const resource = result[i][j];
					const path = resource.getPath();
					if (!files[path]) {
						files[path] = true;
						resources.push(resource);
					}
				}
			}

			trace.collection(this._name);
			return resources;
		});
	}

	/**
	 * Locates resources by path.
	 *
	 * @private
	 * @param {string} virPath Virtual path
	 * @param {object} options Options
	 * @param {@ui5/fs/tracing.Trace} trace Trace instance
	 * @returns {Promise<@ui5/fs/Resource|null>}
	 *   Promise resolving to a single resource or <code>null</code> if no resource is found
	 */
	_byPath(virPath, options, trace) {
		const that = this;
		const byPath = (i) => {
			if (i > this._readers.length - 1) {
				return null;
			}
			return this._readers[i]._byPath(virPath, options, trace).then((resource) => {
				if (resource) {
					resource.pushCollection(that._name);
					return resource;
				} else {
					return byPath(++i);
				}
			});
		};
		return byPath(0);
	}
}

export default ReaderCollectionPrioritized;

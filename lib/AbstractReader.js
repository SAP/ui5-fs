import randomInt from "random-int";
import Trace from "./tracing/Trace.js";

/**
 * Abstract resource locator
 *
 * @public
 * @class
 * @abstract
 * @alias @ui5/fs/AbstractReader
 */
class AbstractReader {
	/**
	 * The constructor.
	 *
	 * @public
	 */
	constructor() {
		if (new.target === AbstractReader) {
			throw new TypeError("Class 'AbstractReader' is abstract");
		}
	}

	/**
	 * Locates resources by matching glob patterns.
	 *
	 * @example
	 * byGlob("**‏/*.{html,htm}");
	 * byGlob("**‏/.library");
	 * byGlob("/pony/*");
	 *
	 * @public
	 * @param {string|string[]} virPattern glob pattern as string or array of glob patterns for
	 * 										virtual directory structure
	 * @param {object} [options] glob options
	 * @param {boolean} [options.nodir=true] Do not match directories
	 * @returns {Promise<@ui5/fs/Resource[]>} Promise resolving to list of resources
	 */
	byGlob(virPattern, options = {nodir: true}) {
		const trace = new Trace(virPattern);
		return this._byGlob(virPattern, options, trace).then(function(result) {
			trace.printReport();
			return result;
		}).then((resources) => {
			if (resources.length > 1) {
				// Pseudo randomize result order to prevent consumers from relying on it:
				// Swap the first object with a randomly chosen one
				const x = 0;
				const y = randomInt(0, resources.length - 1);
				// Swap object at index "x" with  "y"
				resources[x] = [resources[y], resources[y]=resources[x]][0];
			}
			return resources;
		});
	}

	/**
	 * Locates resources by matching a given path.
	 *
	 * @public
	 * @param {string} virPath Virtual path
	 * @param {object} [options] Options
	 * @param {boolean} [options.nodir=true] Do not match directories
	 * @returns {Promise<@ui5/fs/Resource>} Promise resolving to a single resource
	 */
	byPath(virPath, options = {nodir: true}) {
		const trace = new Trace(virPath);
		return this._byPath(virPath, options, trace).then(function(resource) {
			trace.printReport();
			return resource;
		});
	}

	/**
	 * Create a [Filter-Reader]{@link @ui5/fs/readers/Filter} from the current reader
	 *
	 * @public
	 * @param {@ui5/fs/readers/Filter~callback} callback
	 * 				Filter function. Will be called for every resource passed through this reader.
	 * @returns {Promise<@ui5/fs/AbstractReader>}  Promise resolving with filter instance
	 */
	async filter(callback) {
		const {default: Filter} = await import("./readers/Filter.js");
		return new Filter({
			reader: this,
			callback
		});
	}

	/**
	 * Create a [Transformer-Reader]{@link @ui5/fs/readers/Transformer} from the current reader
	 *
	 * @private
	 * @param {@ui5/fs/readers/Transformer~callback} callback
	 * 				Callback to check and eventually transform any resource passed through the reader
	 * @returns {Promise<@ui5/fs/reader.Transformer>} Promise resolving with transformer instance
	 */
	async transform(callback) {
		const {default: Transformer} = await import("./readers/Transformer.js");
		return new Transformer({
			reader: this,
			callback
		});
	}
	/**
	 * Create an abstraction of this reader instance where all requests are prefixed with
	 * <code>/resources/<namespace></code>.
	 *
	 * This simulates "flat" resource access, which is for example common for projects of type
	 * "application"
	 *
	 * @public
	 * @param {string} namespace Project namespace
	 * @returns {Promise<@ui5/fs/AbstractReader>} Promise resolving with reader instance
	 */
	async flatten(namespace) {
		const {default: Link} = await import("./readers/Link.js");
		return new Link({
			reader: this,
			pathMapping: {
				linkPath: `/`,
				targetPath: `/resources/${namespace}/`
			}
		});
	}

	/**
	 * Locates resources by one or more glob patterns.
	 *
	 * @abstract
	 * @protected
	 * @param {string|string[]} virPattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param {object} options glob options
	 * @param {@ui5/fs/tracing.Trace} trace Trace instance
	 * @returns {Promise<@ui5/fs/Resource[]>} Promise resolving to list of resources
	 */
	_byGlob(virPattern, options, trace) {
		throw new Error("Function '_byGlob' is not implemented");
	}

	/**
	 * Locate resources by matching a single glob pattern.
	 *
	 * @abstract
	 * @protected
	 * @param {string} pattern glob pattern
	 * @param {object} options glob options
	 * @param {@ui5/fs/tracing.Trace} trace Trace instance
	 * @returns {Promise<@ui5/fs/Resource[]>} Promise resolving to list of resources
	 */
	_runGlob(pattern, options, trace) {
		throw new Error("Function '_runGlob' is not implemented");
	}

	/**
	 * Locates resources by path.
	 *
	 * @abstract
	 * @protected
	 * @param {string} virPath Virtual path
	 * @param {object} options Options
	 * @param {@ui5/fs/tracing.Trace} trace Trace instance
	 * @returns {Promise<@ui5/fs/Resource>} Promise resolving to a single resource
	 */
	_byPath(virPath, options, trace) {
		throw new Error("Function '_byPath' is not implemented");
	}
}

export default AbstractReader;

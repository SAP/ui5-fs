import randomInt from "random-int";
import Trace from "./tracing/Trace.js";
import Resource from "./Resource.js";

/**
 * Abstract resource locator implementing the general API for <b>reading</b> resources
 *
 * @abstract
 * @public
 * @class
 * @alias @ui5/fs/AbstractReader
 */
class AbstractReader {
	_name: string | undefined;
	/**
	 * The constructor.
	 *
	 * @public
	 * @param {string} name Name of the reader. Typically used for tracing purposes
	 */
	constructor(name?: string) {
		if (new.target === AbstractReader) {
			throw new TypeError("Class 'AbstractReader' is abstract");
		}
		this._name = name;
	}

	/*
	 * Returns the name of the reader instance. This can be used for logging/tracing purposes.
	 *
	 * @returns {string} Name of the reader
	 */
	getName(): string {
		return this._name ?? `<unnamed ${this.constructor.name} Reader>`;
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
	byGlob(virPattern: string, options = {nodir: true}): Promise<Resource[]> {
		const trace = new Trace(virPattern);
		return this._byGlob(virPattern, options, trace).then(function (result: Resource[]) {
			trace.printReport();
			return result;
		}).then((resources: Resource[]) => {
			if (resources.length > 1) {
				// Pseudo randomize result order to prevent consumers from relying on it:
				// Swap the first object with a randomly chosen one
				const x = 0;
				const y = randomInt(0, resources.length - 1);
				// Swap object at index "x" with  "y"
				resources[x] = [resources[y], resources[y] = resources[x]][0];
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
	byPath(virPath: string, options = {nodir: true}): Promise<Resource | null> {
		const trace = new Trace(virPath);
		return this._byPath(virPath, options, trace).then(function (resource) {
			trace.printReport();
			return resource;
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
	_byGlob(_virPattern: string | string[],
		_options: {
			nodir: boolean;
		},
		_trace: Trace): Promise<Resource[]> {
		throw new Error("Function '_byGlob' is not implemented");
	}

	/**
	 * Locate resources by matching a single glob pattern.
	 *
	 * @abstract
	 * @protected
	 * @param {string|string[]} pattern glob pattern
	 * @param {object} options glob options
	 * @param {@ui5/fs/tracing.Trace} trace Trace instance
	 * @returns {Promise<@ui5/fs/Resource[]>} Promise resolving to list of resources
	 */
	_runGlob(_pattern: string | string[], _options: {nodir: boolean}, _trace: Trace): Promise<Resource[]> {
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
	_byPath(_virPath: string, _options: object, _trace: Trace): Promise<Resource | null> {
		throw new Error("Function '_byPath' is not implemented");
	}
}

export default AbstractReader;

import randomInt from "random-int";
import Trace from "./tracing/Trace.js";
import {ResourceInterface} from "./Resource.js";

/**
 * Abstract resource locator implementing the general API for <b>reading</b> resources
 *
 * @alias @ui5/fs/AbstractReader
 */
class AbstractReader {
	_name: string | undefined;
	/**
	 * The constructor.
	 *
	 * @param name Name of the reader. Typically used for tracing purposes
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
	 * @param virPattern glob pattern as string or array of glob patterns for
	 * 										virtual directory structure
	 * @param [options] glob options
	 * @param [options.nodir] Do not match directories
	 * @returns Promise resolving to list of resources
	 */
	byGlob(virPattern: string | string[], options = {nodir: true}): Promise<ResourceInterface[]> {
		const trace = new Trace(virPattern);
		return this._byGlob(virPattern, options, trace).then(function (result: ResourceInterface[]) {
			trace.printReport();
			return result;
		}).then((resources: ResourceInterface[]) => {
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
	 * @param virPath Virtual path
	 * @param [options] Options
	 * @param [options.nodir] Do not match directories
	 * @returns Promise resolving to a single resource
	 */
	byPath(virPath: string, options = {nodir: true}) {
		const trace = new Trace(virPath);
		return this._byPath(virPath, options, trace).then(function (resource) {
			trace.printReport();
			return resource;
		});
	}

	/**
	 * Locates resources by one or more glob patterns.
	 *
	 * @param virPattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param _virPattern
	 * @param _options glob options
	 * @param _options.nodir
	 * @param _trace Trace instance
	 */
	_byGlob(_virPattern: string | string[],
		_options: {
			nodir: boolean;
		},
		_trace: Trace): Promise<ResourceInterface[]> {
		throw new Error("Function '_byGlob' is not implemented");
	}

	/**
	 * Locate resources by matching a single glob pattern.
	 *
	 * @param pattern glob pattern
	 * @param _pattern
	 * @param _options glob options
	 * @param _options.nodir
	 * @param _trace Trace instance
	 */
	_runGlob(_pattern: string | string[], _options: {nodir: boolean}, _trace: Trace): Promise<ResourceInterface[]> {
		throw new Error("Function '_runGlob' is not implemented");
	}

	/**
	 * Locates resources by path.
	 *
	 * @param virPath Virtual path
	 * @param _virPath
	 * @param _options glob options
	 * @param _options.nodir
	 * @param _trace Trace instance
	 */
	_byPath(_virPath: string, _options: {nodir: boolean}, _trace: Trace): Promise<ResourceInterface | null> {
		throw new Error("Function '_byPath' is not implemented");
	}
}

export default AbstractReader;

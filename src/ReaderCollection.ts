import AbstractReader from "./AbstractReader.js";
import {type ResourceInterface} from "./Resource.js";
import type Trace from "./tracing/Trace.js";

/**
 * Resource Locator ReaderCollection
 */
class ReaderCollection extends AbstractReader {
	_readers: AbstractReader[];
	/**
	 * The constructor.
	 *
	 * @param parameters Parameters
	 * @param [parameters.name] The collection name
	 * @param [parameters.readers]
	 *   List of resource readers (all tried in parallel).
	 *   If none are provided, the collection will never return any results.
	 */
	constructor({name, readers}: {name?: string; readers?: AbstractReader[]}) {
		super(name);

		// Remove any undefined (empty) readers from array
		this._readers = readers?.filter(($) => $) ?? [];
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
		return Promise.all(this._readers.map(function (resourceLocator) {
			return resourceLocator._byGlob(pattern, options, trace);
		})).then((result) => {
			trace.collection(this._name!);
			return Array.prototype.concat.apply([], result) as ResourceInterface[]; // Flatten array
		});
	}

	/**
	 * Locates resources by path.
	 *
	 * @param virPath Virtual path
	 * @param options Options
	 * @param options.nodir Do not match directories
	 * @param trace Trace instance
	 * @returns
	 *   Promise resolving to a single resource or <code>null</code> if no resource is found
	 */
	_byPath(virPath: string, options: {nodir: boolean}, trace: Trace) {
		const resourceLocatorCount = this._readers.length;

		if (resourceLocatorCount === 0) {
			// Short-circuit if there are no readers (Promise.race does not settle for empty arrays)
			trace.collection(this._name!);
			return Promise.resolve(null);
		}

		// Using Promise.race to deliver files that can be found as fast as possible
		return Promise.race(this._readers.map((resourceLocator) => {
			return resourceLocator._byPath(virPath, options, trace).then((resource) => {
				trace.collection(this._name!);
				if (resource) {
					resource.pushCollection(this._name!);
					return resource;
				} else {
					return null;
				}
			});
		}));
	}
}

export default ReaderCollection;

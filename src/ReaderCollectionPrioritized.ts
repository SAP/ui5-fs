import AbstractReader from "./AbstractReader.js";
import Resource, { ResourceInterface } from "./Resource.js";
import Trace from "./tracing/Trace.js";

/**
 * Prioritized Resource Locator Collection
 *
 * @alias @ui5/fs/ReaderCollectionPrioritized
 */
class ReaderCollectionPrioritized extends AbstractReader {
	_readers: AbstractReader[];

	/**
	 * The constructor.
	 *
	 * @param parameters
	 * @param parameters.name The collection name
	 * @param [parameters.readers]
	 *   Prioritized list of resource readers (tried in the order provided).
	 *   If none are provided, the collection will never return any results.
	 */
	constructor({readers, name}: {readers?: AbstractReader[]; name: string}) {
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
	 * @param options.nodir
	 * @param trace Trace instance
	 * @returns Promise resolving to list of resources
	 */
	_byGlob(pattern: string | string[], options: {nodir: boolean}, trace: Trace) {
		return Promise.all(this._readers.map(function (resourceLocator) {
			return resourceLocator._byGlob(pattern, options, trace);
		})).then((result) => {
			const files = Object.create(null) as Record<string, boolean>;
			const resources = [];
			// Prefer files found in preceding resource locators
			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for (let i = 0; i < result.length; i++) {
				// eslint-disable-next-line @typescript-eslint/prefer-for-of
				for (let j = 0; j < result[i].length; j++) {
					const resource = result[i][j];
					const path = resource.getPath();
					if (!files[path]) {
						files[path] = true;
						resources.push(resource);
					}
				}
			}

			trace.collection(this._name!);
			return resources;
		});
	}

	/**
	 * Locates resources by path.
	 *
	 * @param virPath Virtual path
	 * @param options Options
	 * @param options.nodir
	 * @param trace Trace instance
	 * @returns
	 *   Promise resolving to a single resource or <code>null</code> if no resource is found
	 */
	_byPath(virPath: string, options: {nodir: boolean}, trace: Trace) {
		// const that = this;
		const byPath = (i: number) => {
			if (i > this._readers.length - 1) {
				return Promise.resolve(null);
			}
			return this._readers[i]._byPath(virPath, options, trace)
				.then((resource: ResourceInterface | null): ResourceInterface | Promise<ResourceInterface | null> => {
					if (resource) {
						resource.pushCollection(this._name!);
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

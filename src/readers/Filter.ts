import AbstractReader from "../AbstractReader.js";
import {ResourceInterface} from "../Resource.js";
import Trace from "../tracing/Trace.js";

/**
 * Filter callback
 *
 * @param resource Resource to test
 * @returns Whether to keep the resource
 */
type Filter_Callback = (resource: ResourceInterface) => boolean;

export interface Filter_Params {
	reader: AbstractReader;
	callback: Filter_Callback;
};

/**
 * A reader that allows dynamic filtering of resources passed through it
 *
 * @alias @ui5/fs/readers/Filter
 */
class Filter extends AbstractReader {
	_reader: AbstractReader;
	_callback: (resource: ResourceInterface) => boolean;

	/**
	 * Constructor
	 *
	 * @param parameters Parameters
	 * @param parameters.reader The resource reader or collection to wrap
	 * @param parameters.callback
	 * 				Filter function. Will be called for every resource read through this reader.
	 */
	constructor({reader, callback}: Filter_Params) {
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
	 * @param pattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param options glob options
	 * @param options.nodir
	 * @param trace Trace instance
	 * @returns Promise resolving to list of resources
	 */
	async _byGlob(pattern: string | string[], options: {nodir: boolean}, trace: Trace) {
		const result = await this._reader._byGlob(pattern, options, trace);
		return result.filter(this._callback);
	}

	/**
	 * Locates resources by path.
	 *
	 * @param virPath Virtual path
	 * @param options Options
	 * @param options.nodir
	 * @param trace Trace instance
	 * @returns Promise resolving to a single resource
	 */
	async _byPath(virPath: string, options: {nodir: boolean}, trace: Trace) {
		const result = await this._reader._byPath(virPath, options, trace);
		if (result && !this._callback(result)) {
			return null;
		}
		return result;
	}
}

export default Filter;

import AbstractReader from "./AbstractReader.js";
import {type ResourceInterface} from "./Resource.js";

/**
 * Abstract resource locator implementing the general API for <b>reading and writing</b> resources
 */
class AbstractReaderWriter extends AbstractReader {
	/**
	 * The constructor.
	 *
	 * @param name Name of the reader/writer. Typically used for tracing purposes
	 */
	constructor(name?: string) {
		if (new.target === AbstractReaderWriter) {
			throw new TypeError("Class 'AbstractReaderWriter' is abstract");
		}
		super(name);
	}

	/*
	 * Returns the name of the reader/writer instance. This can be used for logging/tracing purposes.
	 *
	 * @returns {string} Name of the reader/writer
	 */
	getName(): string {
		return this._name ?? `<unnamed ${this.constructor.name} Reader/Writer>`;
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @param resource Resource to write
	 * @param [options] Write options
	 * @param [options.readOnly] Whether the resource content shall be written read-only
	 *						Do not use in conjunction with the <code>drain</code> option.
	 *						The written file will be used as the new source of this resources content.
	 *						Therefore the written file should not be altered by any means.
	 *						Activating this option might improve overall memory consumption.
	 * @param [options.drain] Whether the resource content shall be emptied during the write process.
	 *						Do not use in conjunction with the <code>readOnly</code> option.
	 *						Activating this option might improve overall memory consumption.
	 *						This should be used in cases where this is the last access to the resource.
	 *						E.g. the final write of a resource after all processing is finished.
	 * @returns Promise resolving once data has been written
	 */
	write(resource: ResourceInterface, options = {drain: false, readOnly: false}): Promise<void> {
		return this._write(resource, options);
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @param _resource Resource to write
	 * @param [_options] Write options, see above
	 * @param [_options.drain] Whether the resource content shall be emptied during the write process.
	 *						Do not use in conjunction with the <code>readOnly</code> option.
	 *						Activating this option might improve overall memory consumption.
	 *						This should be used in cases where this is the last access to the resource.
	 *						E.g. the final write of a resource after all processing is finished.
	 * @param [_options.readOnly] Whether the resource content shall be written read-only
	 *						Do not use in conjunction with the <code>drain</code> option.
	 *						The written file will be used as the new source of this resources content.
	 *						Therefore the written file should not be altered by any means.
	 *						Activating this option might improve overall memory consumption.
	 */
	_write(_resource: ResourceInterface, _options?: {drain?: boolean; readOnly?: boolean}): Promise<void> {
		throw new Error("Not implemented");
	}
}

export default AbstractReaderWriter;

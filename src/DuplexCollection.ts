import AbstractReader from "./AbstractReader.js";
import AbstractReaderWriter from "./AbstractReaderWriter.js";
import ReaderCollectionPrioritized from "./ReaderCollectionPrioritized.js";
import {ResourceInterface} from "./Resource.js";
import Trace from "./tracing/Trace.js";

/**
 * Wrapper to keep readers and writers together
 */
class DuplexCollection extends AbstractReaderWriter {
	_reader: AbstractReader;
	_writer: AbstractReaderWriter;
	_combo: ReaderCollectionPrioritized;

	/**
	 * The Constructor.
	 *
	 * @param parameters Parameters
	 * @param parameters.reader Single reader or collection of readers
	 * @param parameters.writer
	 *			A ReaderWriter instance which is only used for writing files
	 * @param [parameters.name] The collection name
	 */
	constructor({reader, writer, name = ""}: {reader: AbstractReader; writer: AbstractReaderWriter; name?: string}) {
		super(name);

		if (!reader) {
			throw new Error(`Cannot create DuplexCollection ${this._name}: No reader provided`);
		}
		if (!writer) {
			throw new Error(`Cannot create DuplexCollection ${this._name}: No writer provided`);
		}

		this._reader = reader;
		this._writer = writer;

		this._combo = new ReaderCollectionPrioritized({
			name: `${name} - ReaderCollectionPrioritized`,
			readers: [
				writer,
				reader,
			],
		});
	}

	/**
	 * Locates resources by glob.
	 *
	 * @param virPattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param options glob options
	 * @param options.nodir Do not match directories
	 * @param trace Trace instance
	 * @returns Promise resolving with a list of resources
	 */
	_byGlob(virPattern: string | string[], options: {nodir: boolean}, trace: Trace) {
		return this._combo._byGlob(virPattern, options, trace);
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
		return this._combo._byPath(virPath, options, trace);
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @param resource The Resource to write
	 * @returns Promise resolving once data has been written
	 */
	_write(resource: ResourceInterface) {
		return this._writer.write(resource);
	}
}

export default DuplexCollection;

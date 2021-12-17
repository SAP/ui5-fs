const clone = require("clone");
const nodePath = require("path");
const ResourceContent = require("./ResourceContent");

const fnTrue = () => true;
const fnFalse = () => false;

/**
 * Resource
 *
 * @public
 * @memberof module:@ui5/fs
 */
class Resource {
	/**
	* Function for dynamic creation of content streams
	*
	* @public
	* @callback module:@ui5/fs.Resource~createStream
	* @returns {stream.Readable} A readable stream of a resources content
	*/

	/**
	 * The constructor.
	 *
	 * @public
	 * @param {object} parameters Parameters
	 * @param {string} parameters.path Virtual path
	 * @param {fs.Stats|object} [parameters.statInfo] File information. Instance of
	 *					[fs.Stats]{@link https://nodejs.org/api/fs.html#fs_class_fs_stats} or similar object
	 * @param {Buffer} [parameters.buffer] Content of this resources as a Buffer instance
	 *					(cannot be used in conjunction with parameters string, stream or createStream)
	 * @param {string} [parameters.string] Content of this resources as a string
	 *					(cannot be used in conjunction with parameters buffer, stream or createStream)
	 * @param {Stream} [parameters.stream] Readable stream of the content of this resource
	 *					(cannot be used in conjunction with parameters buffer, string or createStream)
	 * @param {module:@ui5/fs.Resource~createStream} [parameters.createStream] Function callback that returns a readable
	 *					stream of the content of this resource (cannot be used in conjunction with parameters buffer,
	 *					string or stream).
	 *					In some cases this is the most memory-efficient way to supply resource content
	 * @param {module:@ui5/fs.ResourceContent} [parameters.contentInstance] Resource content instance
	 * @param {object} [parameters.project] Experimental, internal parameter. Do not use
	 */
	constructor({path, statInfo, buffer, string, createStream, stream, contentInstance, project}) {
		if (!path) {
			throw new Error("Cannot create Resource: path parameter missing");
		}
		if (buffer && createStream || buffer && string || buffer && stream || buffer && contentInstance ||
			string && createStream || string && stream || string && contentInstance ||
			stream && createStream || stream && contentInstance ||
			contentInstance && createStream) {
			throw new Error("Cannot create Resource: Please set only one content parameter. " +
				"Buffer, string, stream, createStream or contentInstance");
		}

		this._path = path;
		this._name = this._getNameFromPath(path);
		this._project = project; // Experimental, internal parameter
		this._statInfo = statInfo || { // TODO
			isFile: fnTrue,
			isDirectory: fnFalse,
			isBlockDevice: fnFalse,
			isCharacterDevice: fnFalse,
			isSymbolicLink: fnFalse,
			isFIFO: fnFalse,
			isSocket: fnFalse,
			atimeMs: new Date().getTime(),
			mtimeMs: new Date().getTime(),
			ctimeMs: new Date().getTime(),
			birthtimeMs: new Date().getTime(),
			atime: new Date(),
			mtime: new Date(),
			ctime: new Date(),
			birthtime: new Date()
		};

		if (contentInstance) {
			this._content = contentInstance;
		} else {
			try {
				this._content = new ResourceContent({buffer, string, createStream, stream});
			} catch (err) {
				throw new Error(`Failed to create content for resource ${this._path}: ${err.message}`);
			}
		}

		// Tracing:
		this._collections = [];
	}

	/**
	 * Gets a buffer with the resource content.
	 *
	 * @public
	 * @returns {Promise<Buffer>} Promise resolving with a buffer of the resource content.
	 */
	async getBuffer() {
		try {
			return await this._content.getBuffer();
		} catch (err) {
			throw new Error(`Failed to get buffer for resource ${this._path}: ${err.message}`);
		}
	}

	/**
	 * Sets a Buffer as content.
	 *
	 * @public
	 * @param {Buffer} buffer Buffer instance
	 */
	setBuffer(buffer) {
		this._content = new ResourceContent({buffer});
	}

	/**
	 * Gets a string with the resource content.
	 *
	 * @public
	 * @returns {Promise<string>} Promise resolving with the resource content.
	 */
	async getString() {
		try {
			return await this._content.getString();
		} catch (err) {
			throw new Error(`Failed to get string for resource ${this._path}: ${err.message}`);
		}
	}

	/**
	 * Sets a String as content
	 *
	 * @public
	 * @param {string} string Resource content
	 */
	setString(string) {
		this._content = new ResourceContent({string});
	}

	/**
	 * Gets a readable stream for the resource content.
	 *
	 * Repetitive calls of this function are only possible if new content has been set in the meantime (through
	 * [setStream]{@link module:@ui5/fs.Resource#setStream}, [setBuffer]{@link module:@ui5/fs.Resource#setBuffer}
	 * or [setString]{@link module:@ui5/fs.Resource#setString}). This
	 * is to prevent consumers from accessing drained streams.
	 *
	 * @public
	 * @returns {stream.Readable} Readable stream for the resource content.
	 */
	getStream() {
		try {
			return this._content.getStream();
		} catch (err) {
			throw new Error(`Failed to get stream for resource ${this._path}: ${err.message}`);
		}
	}

	/**
	 * Sets a readable stream as content.
	 *
	 * @public
	 * @param {stream.Readable|module:@ui5/fs.Resource~createStream} stream Readable stream of the resource content or
	 														callback for dynamic creation of a readable stream
	 */
	setStream(stream) {
		const options = {};
		if (typeof stream === "function") {
			options.createStream = stream;
		} else {
			options.stream = stream;
		}
		this._content = new ResourceContent(options);
	}

	/**
	 * Gets the resources path
	 *
	 * @public
	 * @returns {string} (Virtual) path of the resource
	 */
	getPath() {
		return this._path;
	}

	/**
	 * Sets the resources path
	 *
	 * @public
	 * @param {string} path (Virtual) path of the resource
	 */
	setPath(path) {
		this._path = path;
		this._name = this._getNameFromPath(path);
	}

	/**
	 * Gets the resources stat info.
	 * Note that a resources stat information is not updated when the resource is being modified.
	 * Also, depending on the used adapter, some fields might be missing which would be present for a
	 * [fs.Stats]{@link https://nodejs.org/api/fs.html#fs_class_fs_stats} instance.
	 *
	 * @public
	 * @returns {fs.Stats|object} Instance of [fs.Stats]{@link https://nodejs.org/api/fs.html#fs_class_fs_stats}
	 *								or similar object
	 */
	getStatInfo() {
		return this._statInfo;
	}

	/**
	 * Size in bytes allocated by the underlying buffer.
	 *
	 * @see {TypedArray#byteLength}
	 * @returns {Promise<number>} size in bytes, <code>0</code> if there is no content yet
	 */
	async getSize() {
		return this._content.getSize();
	}

	_getNameFromPath(virPath) {
		return nodePath.posix.basename(virPath);
	}

	/**
	 * Adds a resource collection name that was involved in locating this resource.
	 *
	 * @param {string} name Resource collection name
	 */
	pushCollection(name) {
		this._collections.push(name);
	}

	/**
	 * Returns a clone of the resource. The clones content is independent from that of the original resource
	 *
	 * @public
	 * @returns {Promise<module:@ui5/fs.Resource>} Promise resolving with the clone
	 */
	async clone() {
		const options = {
			path: this._path,
			statInfo: clone(this._statInfo),
			contentInstance: this._content
		};

		return new Resource(options);
	}

	/**
	 * Tracing: Get tree for printing out trace
	 *
	 * @returns {object} Trace tree
	 */
	getPathTree() {
		const tree = {};

		let pointer = tree[this._path] = {};

		for (let i = this._collections.length - 1; i >= 0; i--) {
			pointer = pointer[this._collections[i]] = {};
		}

		return tree;
	}
}

module.exports = Resource;

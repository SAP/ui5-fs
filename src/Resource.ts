import stream from "node:stream";
import clone from "clone";
import posixPath from "node:path/posix";
import {Buffer} from "node:buffer";
import type {Stats} from "node:fs";
import type {Project} from "@ui5/project/specifications/Project";
import {isString} from "./utils/tsUtils.js";

const fnTrue = () => true;
const fnFalse = () => false;

enum ALLOWED_SOURCE_METADATA_KEYS {
	ADAPTER = "adapter",
	FS_PATH = "fsPath",
	CONTENT_MODIFIED = "contentModified",
};

/**
 * Function for dynamic creation of content streams
 *
 * @returns {stream.Readable} A readable stream of a resources content
 */
export type Resource_CreateReadableStream = () => stream.Readable;

interface Resource_sourceMetadata {
	[ALLOWED_SOURCE_METADATA_KEYS.ADAPTER]?: string;
	[ALLOWED_SOURCE_METADATA_KEYS.FS_PATH]?: string;
	[ALLOWED_SOURCE_METADATA_KEYS.CONTENT_MODIFIED]?: boolean;
};

// TODO: Validate these options.
// Some might be required while others can be optional.
// Different combinations can be ok.
export interface Resource_Options {
	path: string;
	// It could be a real Stats, but also a Stats like object
	statInfo?: Partial<Stats>;
	buffer?: Buffer;
	string?: string;
	createStream?: Resource_CreateReadableStream;
	stream?: stream.Readable;
	project?: Project;
	sourceMetadata?: Resource_sourceMetadata;
	source?: {
		adapter?: "Abstract";
	};
};

interface Tree {[x: string]: object | Tree};

export interface LegacyResource {
	_path: string;
	// It could be a real Stats, but also a Stats like object
	_statInfo?: Partial<Stats>;
	_source?: {
		adapter?: "Abstract";
	};
	_createStream?: Resource_CreateReadableStream;
	_stream?: stream.Readable;
	_buffer?: Buffer;
	_getBufferFromStream?: () => Promise<Buffer>;
}

export interface ResourceInterface {
	clone(): Promise<Resource>;
	getBuffer(): Promise<Buffer>;
	getName(): string;
	getPath(): string;
	getPathTree(): Tree;
	getProject(): Project | undefined;
	getSourceMetadata(): Resource_sourceMetadata;
	getSize(): Promise<number>;
	getStatInfo(): Partial<Stats>;
	getStream(): stream.Readable;
	getString(): Promise<string>;
	hasProject(): boolean;
	isModified(): boolean;
	pushCollection(name: string): void;
	setBuffer(buffer: Buffer): void;
	setPath(path: string): void;
	setProject(project: Project): void;
	setStream(stream: stream.Readable | Resource_CreateReadableStream): void;
	setString(string: string): void;
}
/**
 * Resource. UI5 Tooling specific representation of a file's content and metadata
 */
class Resource implements ResourceInterface {
	#project;
	#buffer: Buffer | null | undefined;
	#buffering: Promise<Buffer> | null | undefined;
	#collections: string[];
	#contentDrained: boolean | undefined;
	#createStream: Resource_CreateReadableStream | null | undefined;
	#name!: string;
	#path!: string;
	#sourceMetadata: Resource_sourceMetadata;
	#statInfo: Partial<Stats>;
	#stream: stream.Readable | null | undefined;
	#streamDrained: boolean | undefined;
	#isModified: boolean;

	/**
	 *
	 * @param parameters Parameters
	 * @param parameters.path Absolute virtual path of the resource
	 * @param [parameters.statInfo] File information. Instance of
	 *					[fs.Stats]{@link https://nodejs.org/api/fs.html#fs_class_fs_stats} or similar object
	 * @param [parameters.buffer] Content of this resources as a Buffer instance
	 *					(cannot be used in conjunction with parameters string, stream or createStream)
	 * @param [parameters.string] Content of this resources as a string
	 *					(cannot be used in conjunction with parameters buffer, stream or createStream)
	 * @param [parameters.stream] Readable stream of the content of this resource
	 *					(cannot be used in conjunction with parameters buffer, string or createStream)
	 * @param [parameters.createStream] Function callback that returns a readable
	 *					stream of the content of this resource (cannot be used in conjunction with parameters buffer,
	 *					string or stream).
	 *					In some cases this is the most memory-efficient way to supply resource content
	 * @param [parameters.project] Project this resource is associated with
	 * @param [parameters.sourceMetadata] Source metadata for UI5 Tooling internal use.
	 * 	Some information may be set by an adapter to store information for later retrieval. Also keeps track of whether
	 *  a resource content has been modified since it has been read from a source
	 */
	constructor({path, statInfo, buffer, string, createStream, stream, project, sourceMetadata}: Resource_Options
	) {
		if (!path) {
			throw new Error("Unable to create Resource: Missing parameter 'path'");
		}
		if ((buffer && createStream) || (buffer && string) || (string && createStream) || (buffer && stream) ||
			(string && stream) || (createStream && stream)) {
			throw new Error("Unable to create Resource: Please set only one content parameter. " +
				"'buffer', 'string', 'stream' or 'createStream'");
		}

		if (sourceMetadata) {
			if (typeof sourceMetadata !== "object") {
				throw new Error(`Parameter 'sourceMetadata' must be of type "object"`);
			}

			// TODO: TS Those checks are completely redundant, but some tests
			// and maybe runtime code would rely on them. A major refactoring
			// would be needed
			for (const metadataKey in sourceMetadata) { // Also check prototype
				if (!Object.values(ALLOWED_SOURCE_METADATA_KEYS)
					.includes(metadataKey as ALLOWED_SOURCE_METADATA_KEYS)) {
					throw new Error(`Parameter 'sourceMetadata' contains an illegal attribute: ${metadataKey}`);
				}
				if (!["string", "boolean"]
					.includes(typeof sourceMetadata[metadataKey as ALLOWED_SOURCE_METADATA_KEYS])) {
					throw new Error(
						`Attribute '${metadataKey}' of parameter 'sourceMetadata' ` +
						`must be of type "string" or "boolean"`);
				}
			}
		}

		this.setPath(path);

		this.#sourceMetadata = sourceMetadata ?? {};

		// This flag indicates whether a resource has changed from its original source.
		// resource.isModified() is not sufficient, since it only reflects the modification state of the
		// current instance.
		// Since the sourceMetadata object is inherited to clones, it is the only correct indicator
		this.#sourceMetadata.contentModified ??= false;

		this.#isModified = false;

		this.#project = project;

		this.#statInfo = statInfo ?? { // TODO
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
			birthtime: new Date(),
		};

		if (createStream) {
			this.#createStream = createStream;
		} else if (stream) {
			this.#stream = stream;
		} else if (buffer) {
			// Use private setter, not to accidentally set any modified flags
			this.#setBuffer(buffer);
		} else if (isString(string)) {
			// Use private setter, not to accidentally set any modified flags
			this.#setBuffer(Buffer.from(string, "utf8"));
		}

		// Tracing:
		this.#collections = [];
	}

	/**
	 * Gets a buffer with the resource content.
	 *
	 * @returns Promise resolving with a buffer of the resource content.
	 */
	async getBuffer(): Promise<Buffer> {
		if (this.#contentDrained) {
			throw new Error(`Content of Resource ${this.#path} has been drained. ` +
				"This might be caused by requesting resource content after a content stream has been " +
				"requested and no new content (e.g. a new stream) has been set.");
		}
		if (this.#buffer) {
			return this.#buffer;
		} else if (this.#createStream || this.#stream) {
			return this.#getBufferFromStream();
		} else {
			throw new Error(`Resource ${this.#path} has no content`);
		}
	}

	/**
	 * Sets a Buffer as content.
	 *
	 * @param buffer Buffer instance
	 */
	setBuffer(buffer: Buffer) {
		this.#sourceMetadata.contentModified = true;
		this.#isModified = true;
		this.#setBuffer(buffer);
	}

	#setBuffer(buffer: Buffer) {
		this.#createStream = null;
		// if (this.#stream) { // TODO this may cause strange issues
		// 	this.#stream.destroy();
		// }
		this.#stream = null;
		this.#buffer = buffer;
		this.#contentDrained = false;
		this.#streamDrained = false;
	}

	/**
	 * Gets a string with the resource content.
	 *
	 * @returns Promise resolving with the resource content.
	 */
	getString(): Promise<string> {
		if (this.#contentDrained) {
			return Promise.reject(new Error(`Content of Resource ${this.#path} has been drained. ` +
				"This might be caused by requesting resource content after a content stream has been " +
				"requested and no new content (e.g. a new stream) has been set."));
		}
		return this.getBuffer().then((buffer) => buffer.toString());
	}

	/**
	 * Sets a String as content
	 *
	 * @param string Resource content
	 */
	setString(string: string) {
		this.setBuffer(Buffer.from(string, "utf8"));
	}

	/**
	 * Gets a readable stream for the resource content.
	 *
	 * Repetitive calls of this function are only possible if new content has been set in the meantime (through
	 * [setStream]{@link @ui5/fs/Resource#setStream}, [setBuffer]{@link @ui5/fs/Resource#setBuffer}
	 * or [setString]{@link @ui5/fs/Resource#setString}). This
	 * is to prevent consumers from accessing drained streams.
	 *
	 * @returns Readable stream for the resource content.
	 */
	getStream(): stream.Readable {
		if (this.#contentDrained) {
			throw new Error(`Content of Resource ${this.#path} has been drained. ` +
				"This might be caused by requesting resource content after a content stream has been " +
				"requested and no new content (e.g. a new stream) has been set.");
		}
		let contentStream;
		if (this.#buffer) {
			const bufferStream = new stream.PassThrough();
			bufferStream.end(this.#buffer);
			contentStream = bufferStream;
		} else if (this.#createStream || this.#stream) {
			contentStream = this.#getStream();
		}
		if (!contentStream) {
			throw new Error(`Resource ${this.#path} has no content`);
		}
		// If a stream instance is being returned, it will typically get drained be the consumer.
		// In that case, further content access will result in a "Content stream has been drained" error.
		// However, depending on the execution environment, a resources content stream might have been
		//	transformed into a buffer. In that case further content access is possible as a buffer can't be
		//	drained.
		// To prevent unexpected "Content stream has been drained" errors caused by changing environments, we flag
		//	the resource content as "drained" every time a stream is requested. Even if actually a buffer or
		//	createStream callback is being used.
		this.#contentDrained = true;
		return contentStream;
	}

	/**
	 * Sets a readable stream as content.
	 *
	 * @param stream Readable stream of the resource content or
	 														callback for dynamic creation of a readable stream
	 */
	setStream(stream: stream.Readable | Resource_CreateReadableStream) {
		this.#isModified = true;
		this.#sourceMetadata.contentModified = true;

		this.#buffer = null;
		// if (this.#stream) { // TODO this may cause strange issues
		// 	this.#stream.destroy();
		// }
		if (typeof stream === "function") {
			this.#createStream = stream;
			this.#stream = null;
		} else {
			this.#stream = stream;
			this.#createStream = null;
		}
		this.#contentDrained = false;
		this.#streamDrained = false;
	}

	/**
	 * Gets the virtual resources path
	 *
	 * @returns Virtual path of the resource
	 */
	getPath(): string {
		return this.#path ?? "";
	}

	/**
	 * Sets the virtual resources path
	 *
	 * @param path Absolute virtual path of the resource
	 */
	setPath(path: string) {
		path = posixPath.normalize(path);
		if (!posixPath.isAbsolute(path)) {
			throw new Error(`Unable to set resource path: Path must be absolute: ${path}`);
		}
		this.#path = path;
		this.#name = posixPath.basename(path);
	}

	/**
	 * Gets the resource name
	 *
	 * @returns Name of the resource
	 */
	getName(): string {
		return this.#name;
	}

	/**
	 * Gets the resources stat info.
	 * Note that a resources stat information is not updated when the resource is being modified.
	 * Also, depending on the used adapter, some fields might be missing which would be present for a
	 * [fs.Stats]{@link https://nodejs.org/api/fs.html#fs_class_fs_stats} instance.
	 *
	 * @returns Instance of [fs.Stats]{@link https://nodejs.org/api/fs.html#fs_class_fs_stats}
	 *								or similar object
	 */
	getStatInfo(): Partial<Stats> {
		return this.#statInfo;
	}

	/**
	 * Size in bytes allocated by the underlying buffer.
	 *
	 * @see {TypedArray#byteLength}
	 * @returns size in bytes, <code>0</code> if there is no content yet
	 */
	async getSize(): Promise<number> {
		// if resource does not have any content it should have 0 bytes
		if (!this.#buffer && !this.#createStream && !this.#stream) {
			return 0;
		}
		const buffer = await this.getBuffer();
		return buffer.byteLength;
	}

	/**
	 * Adds a resource collection name that was involved in locating this resource.
	 *
	 * @param name Resource collection name
	 */
	pushCollection(name: string) {
		this.#collections.push(name);
	}

	/**
	 * Returns a clone of the resource. The clones content is independent from that of the original resource
	 *
	 * @returns Promise resolving with the clone
	 */
	async clone(): Promise<Resource> {
		const options = await this.#getCloneOptions();
		return new Resource(options);
	}

	async #getCloneOptions(): Promise<Resource_Options> {
		const options: Resource_Options = {
			path: this.#path,
			statInfo: clone(this.#statInfo),
			sourceMetadata: clone(this.#sourceMetadata),
		};

		if (this.#stream) {
			options.buffer = await this.#getBufferFromStream();
		} else if (this.#createStream) {
			options.createStream = this.#createStream;
		} else if (this.#buffer) {
			options.buffer = this.#buffer;
		}

		return options;
	}

	/**
	 * Retrieve the project assigned to the resource
	 * <br/>
	 * <b>Note for UI5 Tooling extensions (i.e. custom tasks, custom middleware):</b>
	 * In order to ensure compatibility across UI5 Tooling versions, consider using the
	 * <code>getProject(resource)</code> method provided by
	 * [TaskUtil]{@link module:@ui5/project/build/helpers/TaskUtil} and
	 * [MiddlewareUtil]{@link module:@ui5/server.middleware.MiddlewareUtil}, which will
	 * return a Specification Version-compatible Project interface.
	 *
	 * @returns Project this resource is associated with
	 */
	getProject(): Project | undefined {
		return this.#project;
	}

	/**
	 * Assign a project to the resource
	 *
	 * @param project Project this resource is associated with
	 */
	setProject(project: Project) {
		if (this.#project) {
			throw new Error(`Unable to assign project ${project.getName()} to resource ${this.#path}: ` +
				`Resource is already associated to project ${this.#project.getName()}`);
		}
		this.#project = project;
	}

	/**
	 * Check whether a project has been assigned to the resource
	 *
	 * @returns True if the resource is associated with a project
	 */
	hasProject(): boolean {
		return !!this.#project;
	}

	/**
	 * Check whether the content of this resource has been changed during its life cycle
	 *
	 * @returns True if the resource's content has been changed
	 */
	isModified(): boolean {
		return this.#isModified;
	}

	/**
	 * Tracing: Get tree for printing out trace
	 *
	 * @returns Trace tree
	 */
	getPathTree(): Tree {
		const tree = Object.create(null) as Tree;

		let pointer = tree[this.#path] = Object.create(null) as Tree;

		for (let i = this.#collections.length - 1; i >= 0; i--) {
			pointer = pointer[this.#collections[i]] = Object.create(null) as Tree;
		}

		return tree;
	}

	/**
	 * Returns source metadata which may contain information specific to the adapter that created the resource
	 * Typically set by an adapter to store information for later retrieval.
	 *
	 * @returns
	 */
	getSourceMetadata(): Resource_sourceMetadata {
		return this.#sourceMetadata;
	}

	/**
	 * Returns the content as stream.
	 *
	 * @returns Readable stream
	 */
	#getStream(): stream.Readable {
		if (this.#streamDrained) {
			throw new Error(`Content stream of Resource ${this.#path} is flagged as drained.`);
		}
		if (this.#createStream) {
			return this.#createStream();
		}
		this.#streamDrained = true;
		return this.#stream!;
	}

	/**
	 * Converts the buffer into a stream.
	 *
	 * @returns Promise resolving with buffer.
	 */
	#getBufferFromStream(): Promise<Buffer> {
		if (this.#buffering) { // Prevent simultaneous buffering, causing unexpected access to drained stream
			return this.#buffering;
		}
		return this.#buffering = new Promise((resolve, reject) => {
			const contentStream = this.#getStream();
			const buffers: Buffer[] = [];

			contentStream.on("data", (data: Buffer) => {
				buffers.push(data);
			});
			contentStream.on("error", (err) => {
				reject(err);
			});
			contentStream.on("end", () => {
				const buffer = Buffer.concat(buffers);
				this.#setBuffer(buffer);
				this.#buffering = null;
				resolve(buffer);
			});
		});
	}
}

export default Resource;

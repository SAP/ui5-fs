const Resource = require("./Resource");
const rResourcesTestResources = /^\/resources\/|^\/test-resources\//;
/**
 * Project Resource
 *
 * @public
 * @memberof module:@ui5/fs
 */
class ProjectResource extends Resource {
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
	 * @param {module:@ui5/project.specifications.Project} parameters.project Project this resource belongs to
	 */
	constructor({path, statInfo, buffer, string, createStream, stream, project}) {
		super({path, statInfo, buffer, string, createStream, stream});
		this._project = project;
		this._namespace = project.getNamespace();
		this.setPath(path); // Normalize path to always contain namespace
	}

	/**
	 * Gets the resources path
	 *
	 * @public
	 * @param {boolean} [includeNamespace=true] Whether or not the returned path should contain the project's namespace
	 * @returns {string} (Virtual) path of the resource
	 */
	getPath(includeNamespace=true) {
		if (includeNamespace || !this._namepsace) {
			// Path always contains the namespace if there is one
			return this._path;
		}

	}

	/**
	 * Sets the resources path
	 *
	 * @public
	 * @param {string} path (Virtual) path of the resource
	 */
	setPath(path) {
		if (this._namespace) {
			const prefixMatch = path.match(rResourcesTestResources);
			if (!prefixMatch) {
				throw new Error(
					`Path for resources of namespaced projects must start with either` +
					`/resources/ or /test-resources/ but is ${path}`);
			}
			const prefix = prefixMatch[0];
			const namespacedPrefix = `${prefix}${this._namespace}/`;
			if (!path.startsWith(namespacedPrefix)) {
				path = path.replace(prefix, namespacedPrefix);
			}
		}

		this._path = path;
		this._name = this._getNameFromPath(path);
	}

	/**
	 * Returns a clone of the resource. The clones content is independent from that of the original resource
	 *
	 * @public
	 * @returns {Promise<module:@ui5/fs.ProjectResource>} Promise resolving with the clone
	 */
	async clone() {
		const options = await this._createCloneParameters();
		options.project = this._project;
		return new ProjectResource(options);
	}
}

module.exports = ProjectResource;

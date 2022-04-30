const Resource = require("./Resource");

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
	 * @param {object} parameters.source TODO
	 */
	constructor({path, statInfo, buffer, string, createStream, stream, project, source}) {
		super({path, statInfo, buffer, string, createStream, stream, source});
		if (!project) {
			throw new Error("Cannot create ProjectResource: 'project' parameters missing");
		}
		if (!source) {
			throw new Error("Cannot create ProjectResource: 'source' parameters missing");
		}
		this.__project = project; // Two underscores since "_project" was widely used in UI5 Tooling 2.0
	}

	getProject() {
		return this.__project;
	}

	getSource() {
		return this._source;
	}

	_createClone(options) {
		options.project = this.__project;
		return new ProjectResource(options);
	}
}

module.exports = ProjectResource;

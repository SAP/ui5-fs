const log = require("@ui5/logger").getLogger("resources:adapters:ZIPArchive");
const micromatch = require("micromatch");
const Resource = require("../Resource");
const AbstractAdapter = require("./AbstractAdapter");
const StreamZip = require("node-stream-zip");

/**
 * Virtual resource Adapter
 *
 * @public
 * @memberof module:@ui5/fs.adapters
 * @augments module:@ui5/fs.adapters.AbstractAdapter
 */
class ZIPArchive extends AbstractAdapter {
	/**
	 * The constructor.
	 *
	 * @public
	 * @param {object} parameters Parameters
	 * @param {string} parameters.virBasePath Virtual base path
	 * @param {string[]} [parameters.excludes] List of glob patterns to exclude
	 */
	constructor({virBasePath, project, fsArchive, excludes}) {
		super({virBasePath, project, excludes});
		this._zipPath = fsArchive;
		this._zipLoaded = null;
		this._virFiles = {}; // map full of files
		this._virDirs = {}; // map full of directories
	}

	async _prepare() {
		if ( this._zipLoaded == null ) {
			this._zipLoaded = new Promise((resolve, reject) => {
				const zip = this._zip = new StreamZip({
					file: this._zipPath,
					storeEntries: true
				});

				// Handle errors
				zip.on("error", err => {
					console.error(err);
					reject(err);
				});
				zip.on("ready", () => {
					console.log("Entries read: " + zip.entriesCount);
					for (const entry of Object.values(zip.entries())) {
						const desc = entry.isDirectory ? "directory" : `${entry.size} bytes`;
						if ( entry.name.startsWith("META-INF/resources/") ||
							entry.name.startsWith("META-INF/test-resources/") ) {
							const virPath = entry.name.slice("META-INF".length);
							if ( entry.isDirectory ) {
								this._virDirs[virPath] = new Resource({
									project: this.project,
									statInfo: { // TODO: make closer to fs stat info
										isDirectory: function() {
											return true;
										}
									},
									path: virPath
								});
							} else {
								this._virFiles[virPath] = new Resource({
									project: this.project,
									statInfo: { // TODO: make closer to fs stat info
										isDirectory: function() {
											return false;
										}
									},
									path: virPath,
									createStream: async () => {
										return new Promise((resolve, reject) => {
											zip.stream("META-INF" + virPath, (err, stm) => {
												if ( err ) {
													reject(err);
												} else {
													resolve(stm);
												}
											});
										});
									}
								});
							}
							// console.log(`Entry ${virPath}: ${desc}`);
						} else {
							// console.log(`Entry ignored: ${entry.name}`);
						}
					}
					resolve();
				});
			});
		}

		return this._zipLoaded;
	}

	/**
	 * Locate resources by glob.
	 *
	 * @private
	 * @param {Array} patterns array of glob patterns
	 * @param {object} [options={}] glob options
	 * @param {boolean} [options.nodir=true] Do not match directories
	 * @param {module:@ui5/fs.tracing.Trace} trace Trace instance
	 * @returns {Promise<module:@ui5/fs.Resource[]>} Promise resolving to list of resources
	 */
	async _runGlob(patterns, options = {nodir: true}, trace) {
		await this._prepare();
		if (patterns[0] === "" && !options.nodir) { // Match virtual root directory
			return [
				new Resource({
					project: this.project,
					statInfo: { // TODO: make closer to fs stat info
						isDirectory: function() {
							return true;
						}
					},
					path: this._virBasePath.slice(0, -1)
				})
			];
		}

		const filePaths = Object.keys(this._virFiles);
		const matchedFilePaths = micromatch(filePaths, patterns, {
			dot: true
		});
		let matchedResources = matchedFilePaths.map((virPath) => {
			return this._virFiles[virPath];
		});

		if (!options.nodir) {
			const dirPaths = Object.keys(this._virDirs);
			const matchedDirs = micromatch(dirPaths, patterns, {
				dot: true
			});
			matchedResources = matchedResources.concat(matchedDirs.map((virPath) => {
				return this._virDirs[virPath];
			}));
		}

		return matchedResources;
	}

	/**
	 * Locates resources by path.
	 *
	 * @private
	 * @param {string} virPath Virtual path
	 * @param {object} options Options
	 * @param {module:@ui5/fs.tracing.Trace} trace Trace instance
	 * @returns {Promise<module:@ui5/fs.Resource>} Promise resolving to a single resource
	 */
	async _byPath(virPath, options, trace) {
		await this._prepare();

		if (this.isPathExcluded(virPath)) {
			return Promise.resolve(null);
		}
		return new Promise((resolve, reject) => {
			if (!virPath.startsWith(this._virBasePath) && virPath !== this._virBaseDir) {
				// Neither starts with basePath, nor equals baseDirectory
				resolve(null);
				return;
			}

			const relPath = virPath.substr(this._virBasePath.length);
			trace.pathCall();

			const resource = this._virFiles[relPath];

			if (!resource || (options.nodir && resource.getStatInfo().isDirectory())) {
				resolve(null);
			} else {
				resolve(resource);
			}
		});
	}
}

module.exports = ZIPArchive;

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
	constructor({virBasePath, project, fsArchive, archivePath = "/", excludes}) {
		super({virBasePath, project, excludes});
		this._zipPath = fsArchive;
		this._archivePath = archivePath;
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
				zip.on("error", (err) => {
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
							let virPath = "/" + entry.name;
							if (virPath.startsWith(this._archivePath)) {
								// console.log("orig path: " + virPath);
								// console.log("archive path: " + this._archivePath);
								virPath = virPath.replace(this._archivePath, "");
								// console.log("new path: " + virPath);
								if ( entry.isDirectory ) {
									this._virDirs[virPath] = true;
								} else {
									this._virFiles[virPath] = true;
								}
							}
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
		// console.log(matchedFilePaths);
		let matchedResources = await Promise.all(matchedFilePaths.map(async (virPath) => {
			const stream = await new Promise((resolve, reject) => {
				this._zip.stream(this._archivePath.substring(1) + virPath, (err, stm) => {
					if ( err ) {
						reject(err);
					} else {
						resolve(stm);
					}
				});
			});
			return new Resource({
				project: this.project,
				statInfo: { // TODO: make closer to fs stat info
					isDirectory: function() {
						return false;
					}
				},
				path: this._virBasePath + virPath,
				stream: stream
			});
		}));

		if (!options.nodir) {
			const dirPaths = Object.keys(this._virDirs);
			const matchedDirs = micromatch(dirPaths, patterns, {
				dot: true
			});
			matchedResources = matchedResources.concat(matchedDirs.map((virPath) => {
				return new Resource({
					project: this.project,
					statInfo: { // TODO: make closer to fs stat info
						isDirectory: function() {
							return true;
						}
					},
					path: this._virBasePath + virPath
				});
			}));
		}

		// console.log(matchedResources);

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
			return null;
		}
		if (!virPath.startsWith(this._virBasePath) && virPath !== this._virBaseDir) {
			// Neither starts with basePath, nor equals baseDirectory
			return null;
		}

		const relPath = virPath.substr(this._virBasePath.length);
		trace.pathCall();
		if (!this._virFiles[relPath]) {
			return null;
		}
		const stream = await new Promise((resolve, reject) => {
			this._zip.stream(this._archivePath.substring(1) + relPath, (err, stm) => {
				if ( err ) {
					reject(err);
				} else {
					resolve(stm);
				}
			});
		});
		return new Resource({
			project: this.project,
			statInfo: { // TODO: make closer to fs stat info
				isDirectory: function() {
					return false;
				}
			},
			path: virPath,
			stream: stream
		});
	}
}

module.exports = ZIPArchive;

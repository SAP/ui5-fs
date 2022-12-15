import logger from "@ui5/logger";
const log = logger.getLogger("resources:adapters:ZIPArchive");
import micromatch from "micromatch";
import AbstractAdapter from "./AbstractAdapter.js";
const {default: StreamZip} = await import("node-stream-zip");

/**
 * Virtual resource Adapter
 *
 * @public
 * @memberof module:@ui5/fs.adapters
 * @extends module:@ui5/fs.adapters.AbstractAdapter
 */
class ZIPArchive extends AbstractAdapter {
	/**
	 * The constructor.
	 *
	 * @public
	 * @param {object} parameters Parameters
	 * @param {string} parameters.virBasePath Virtual base path
	 * @param {object} parameters.project
	 * @param {object} parameters.fsArchive
	 * @param {string} parameters.archivePath
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
					log.info("Entries read: " + zip.entriesCount);
					for (const entry of Object.values(zip.entries())) {
						const desc = entry.isDirectory ? "directory" : `${entry.size} bytes`;
						if ( entry.name.startsWith("META-INF/resources/") ||
							entry.name.startsWith("META-INF/test-resources/") ) {
							const virPath = entry.name.slice("META-INF".length);
							if ( entry.isDirectory ) {
								this._virDirs[virPath] = this._createResource({
									project: this.project,
									statInfo: { // TODO: make closer to fs stat info
										isDirectory: function() {
											return true;
										}
									},
									path: virPath
								});
							} else {
								this._virFiles[virPath] = this._createResource({
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
							log.info(`Entry ${virPath}: ${desc}`);
						} else {
							log.info(`Entry ignored: ${entry.name}`);
							let virPath = "/" + entry.name;
							if (virPath.startsWith(this._archivePath)) {
								log.info("orig path: " + virPath);
								log.info("archive path: " + this._archivePath);
								virPath = virPath.replace(this._archivePath, "");
								log.info("new path: " + virPath);
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
		if (patterns[0] === "" && !options.nodir) { // Match virtual root directory
			return [
				this._createResource({
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

		await this._prepare();

		const filePaths = Object.keys(this._virFiles);
		const matchedFilePaths = micromatch(filePaths, patterns, {
			dot: true
		});
		// log.info(matchedFilePaths);
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
			return this._createResource({
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
				return this._createResource({
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

		// log.info(matchedResources);

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
		if (this.isPathExcluded(virPath)) {
			return null;
		}
		if (!virPath.startsWith(this._virBasePath) && virPath !== this._virBaseDir) {
			// Neither starts with basePath, nor equals baseDirectory
			return null;
		}

		await this._prepare();

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
		return this._createResource({
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

export default ZIPArchive;

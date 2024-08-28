import path from "node:path/posix";
import {getLogger} from "@ui5/logger";
const log = getLogger("resources:adapters:AbstractAdapter");
import {minimatch} from "minimatch";
import micromatch from "micromatch";
import AbstractReaderWriter from "../AbstractReaderWriter.js";
import Resource, {Resource_Options, LegacyResource} from "../Resource.js";
import type {Project} from "@ui5/project/specifications/Project";
import Trace from "../tracing/Trace.js";
import {isMigratedResource} from "../utils/tsUtils.js";

/**
 * Abstract Resource Adapter
 *
 * @alias @ui5/fs/adapters/AbstractAdapter
 */
class AbstractAdapter extends AbstractReaderWriter {
	_virBasePath: string;
	_virBaseDir: string;
	_excludes: string[];
	_excludesNegated: string[];
	_project?: Project;

	/**
	 * The constructor
	 *
	 * @param parameters Parameters
	 * @param parameters.virBasePath
	 *   Virtual base path. Must be absolute, POSIX-style, and must end with a slash
	 * @param [parameters.excludes] List of glob patterns to exclude
	 * @param [parameters.project] Experimental, internal parameter. Do not use
	 */
	constructor({virBasePath, excludes = [], project}:
		{virBasePath: string; excludes?: string[]; project?: Project}) {
		if (new.target === AbstractAdapter) {
			throw new TypeError("Class 'AbstractAdapter' is abstract");
		}
		super();

		if (!virBasePath) {
			throw new Error(`Unable to create adapter: Missing parameter 'virBasePath'`);
		}
		if (!path.isAbsolute(virBasePath)) {
			throw new Error(`Unable to create adapter: Virtual base path must be absolute but is '${virBasePath}'`);
		}
		if (!virBasePath.endsWith("/")) {
			throw new Error(
				`Unable to create adapter: Virtual base path must end with a slash but is '${virBasePath}'`);
		}
		this._virBasePath = virBasePath;
		this._virBaseDir = virBasePath.slice(0, -1);
		this._excludes = excludes;
		this._excludesNegated = excludes.map((pattern) => `!${pattern}`);
		this._project = project;
	}

	/**
	 * Locates resources by glob.
	 *
	 * @param virPattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param [options] glob options
	 * @param [options.nodir] Do not match directories
	 * @param trace Trace instance
	 * @returns Promise resolving to list of resources
	 */
	async _byGlob(virPattern: string | string[], options = {nodir: true}, trace: Trace): Promise<Resource[]> {
		const excludes = this._excludesNegated;

		if (!(virPattern instanceof Array)) {
			virPattern = [virPattern];
		}

		// Append static exclude patterns
		virPattern = Array.prototype.concat.apply(virPattern, excludes);
		const normalizedPatterns = virPattern.map(this._normalizePattern.bind(this));
		const patterns = Array.prototype.concat.apply([], normalizedPatterns) as string[];
		if (patterns.length === 0) {
			return [];
		}

		if (!options.nodir) {
			for (let i = patterns.length - 1; i >= 0; i--) {
				const idx = this._virBaseDir.indexOf(patterns[i]);
				if (patterns[i] && idx !== -1 && idx < this._virBaseDir.length) {
					const subPath = patterns[i];
					return [
						this._createResource({
							statInfo: { // TODO: make closer to fs stat info
								isDirectory: function () {
									return true;
								},
							},
							source: {
								adapter: "Abstract",
							},
							path: subPath,
						}),
					];
				}
			}
		}
		return await this._runGlob(patterns, options, trace);
	}

	/**
	 * Validate if virtual path should be excluded
	 *
	 * @param virPath Virtual Path
	 * @returns True if path is excluded, otherwise false
	 */
	_isPathExcluded(virPath: string[]) {
		return micromatch(virPath, this._excludes).length > 0;
	}

	/**
	 * Validate if virtual path should be handled by the adapter.
	 * This means that it either starts with the virtual base path of the adapter
	 * or equals the base directory (base path without a trailing slash)
	 *
	 * @param virPath Virtual Path
	 * @returns True if path should be handled
	 */
	_isPathHandled(virPath: string) {
		// Check whether path starts with base path, or equals base directory
		return virPath.startsWith(this._virBasePath) || virPath === this._virBaseDir;
	}

	/**
	 * Normalizes virtual glob patterns.
	 *
	 * @param virPattern glob pattern for virtual directory structure
	 * @returns A list of normalized glob patterns
	 */
	_normalizePattern(virPattern: string) {
		const mm = new minimatch.Minimatch(virPattern);

		const basePathParts = this._virBaseDir.split("/");

		const matchSubset = (subset: (string | typeof minimatch.GLOBSTAR | RegExp | undefined)[]) => {
			let i;
			for (i = 0; i < basePathParts.length; i++) {
				const globPart = subset[i];
				if (globPart === undefined) {
					log.verbose("Ran out of glob parts to match (this should not happen):");
					if (this._project) { // project is optional
						log.verbose(`Project: ${this._project.getName()}`);
					}
					log.verbose(`Virtual base path: ${this._virBaseDir}`);
					log.verbose(`Pattern to match: ${virPattern}`);
					log.verbose(`Current subset (tried index ${i}):`);
					log.verbose(subset);
					return {idx: i, virtualMatch: true};
				}
				const basePathPart = basePathParts[i];
				if (typeof globPart === "string") {
					if (globPart !== basePathPart) {
						return null;
					} else {
						continue;
					}
				} else if (globPart === minimatch.GLOBSTAR) {
					return {idx: i};
				} else { // Regex
					if (!globPart.test(basePathPart)) {
						return null;
					} else {
						continue;
					}
				}
			}
			if (subset.length === basePathParts.length) {
				return {rootMatch: true};
			}
			return {idx: i};
		};

		const resultGlobs: string[] = [];
		for (let i = 0; i < mm.set.length; i++) {
			const match = matchSubset(mm.set[i]);
			if (match) {
				let resultPattern;
				if (match.virtualMatch) {
					resultPattern = basePathParts.slice(0, match.idx).join("/");
				} else if (match.rootMatch) { // matched one up
					resultPattern = ""; // root "/"
				} else { // matched at some part of the glob
					resultPattern = mm.globParts[i].slice(match.idx).join("/");
					if (resultPattern.startsWith("/")) {
						resultPattern = resultPattern.substr(1);
					}
				}
				if (mm.negate) {
					resultPattern = "!" + resultPattern;
				}
				resultGlobs.push(resultPattern);
			}
		}
		return resultGlobs;
	}

	_createResource(parameters: Resource_Options) {
		if (this._project) {
			parameters.project = this._project;
		}
		return new Resource(parameters);
	}

	_migrateResource(resource: LegacyResource | Resource) {
		// This function only returns a promise if a migration is necessary.
		// Since this is rarely the case, we therefore reduce the amount of
		// created Promises by making this differentiation

		// Check if its a fs/Resource v3, function 'hasProject' was
		// introduced with v3 therefore take it as the indicator
		if (isMigratedResource(resource)) {
			return resource;
		}
		return this._createFromLegacyResource(resource);
	}

	async _createFromLegacyResource(resource: LegacyResource) {
		const options = {
			path: resource._path,
			statInfo: resource._statInfo,
			source: resource._source,
		} as Resource_Options;

		if (resource._stream && resource._getBufferFromStream) {
			options.buffer = await resource._getBufferFromStream();
		} else if (resource._createStream) {
			options.createStream = resource._createStream;
		} else if (resource._buffer) {
			options.buffer = resource._buffer;
		}
		return new Resource(options);
	}

	_assignProjectToResource(resource: Resource) {
		if (this._project) {
			// Assign project to resource if necessary
			if (resource.hasProject()) {
				if (resource.getProject() !== this._project) {
					throw new Error(
						`Unable to write resource associated with project ` +
						`${resource.getProject()?.getName()} into adapter of project ${this._project.getName()}: ` +
						resource.getPath());
				}
				return;
			}
			log.silly(`Associating resource ${resource.getPath()} with project ${this._project.getName()}`);
			resource.setProject(this._project);
		}
	}

	_resolveVirtualPathToBase(inputVirPath: string, writeMode = false): string | null {
		if (!path.isAbsolute(inputVirPath)) {
			throw new Error(`Failed to resolve virtual path '${inputVirPath}': Path must be absolute`);
		}
		// Resolve any ".." segments to make sure we compare the effective start of the path
		// with the virBasePath
		const virPath = path.normalize(inputVirPath);

		if (!writeMode) {
			// When reading resources, validate against path excludes and return null if the given path
			// does not match this adapters base path
			if (!this._isPathHandled(virPath)) {
				if (log.isLevelEnabled("silly")) {
					log.silly(`Failed to resolve virtual path '${inputVirPath}': ` +
					`Resolved path does not start with adapter base path '${this._virBasePath}' or equals ` +
					`base dir: ${this._virBaseDir}`);
				}
				return null;
			}
			if (this._isPathExcluded(virPath)) {
				if (log.isLevelEnabled("silly")) {
					log.silly(`Failed to resolve virtual path '${inputVirPath}': ` +
					`Resolved path is excluded by configuration of adapter with base path '${this._virBasePath}'`);
				}
				return null;
			}
		} else if (!this._isPathHandled(virPath)) {
			// Resolved path is not within the configured base path and does
			// not equal the virtual base directory.
			// Since we don't want to write resources to foreign locations, we throw an error
			throw new Error(
				`Failed to write resource with virtual path '${inputVirPath}': Path must start with ` +
				`the configured virtual base path of the adapter. Base path: '${this._virBasePath}'`);
		}

		const relPath = virPath.substr(this._virBasePath.length);
		return relPath;
	}
}

export default AbstractAdapter;

import {getLogger} from "@ui5/logger";
const log = getLogger("resources:adapters:Memory");
import micromatch from "micromatch";
import AbstractAdapter from "./AbstractAdapter.js";
import {Project} from "@ui5/project/specifications/Project";
import Resource, {LegacyResource, ResourceInterface} from "../Resource.js";
import Trace from "../tracing/Trace.js";

const ADAPTER_NAME = "Memory";

/**
 * Virtual resource Adapter
 *
 * @alias @ui5/fs/adapters/Memory
 */
class Memory extends AbstractAdapter {
	_virFiles: Record<string, Resource>;
	_virDirs: Record<string, Resource>;

	/**
	 * The constructor.
	 *
	 * @param parameters Parameters
	 * @param parameters.virBasePath
	 *   Virtual base path. Must be absolute, POSIX-style, and must end with a slash
	 * @param [parameters.excludes] List of glob patterns to exclude
	 * @param [parameters.project] Project this adapter belongs to (if any)
	 */
	constructor({virBasePath, project, excludes}: {virBasePath: string; project?: Project; excludes?: string[]}) {
		super({virBasePath, project, excludes});
		this._virFiles = Object.create(null) as Record<string, Resource>; // map full of files
		this._virDirs = Object.create(null) as Record<string, Resource>; // map full of directories
	}

	/**
	 * Matches and returns resources from a given map (either _virFiles or _virDirs).
	 *
	 * @param patterns glob patterns
	 * @param resourceMap Resources cache
	 * @returns
	 */
	async _matchPatterns(patterns: string[], resourceMap: Record<string, Resource>): Promise<ResourceInterface[]> {
		const resourcePaths = Object.keys(resourceMap);
		const matchedPaths = micromatch(resourcePaths, patterns, {
			dot: true,
		});
		return await Promise.all(matchedPaths.map((virPath) => {
			const resource: Resource = resourceMap[virPath];
			if (resource) {
				return this._cloneResource(resource);
			}
		}).filter(($) => !!$));
	}

	async _cloneResource(resource: Resource): Promise<Resource> {
		const clonedResource = await resource.clone();
		if (this._project) {
			clonedResource.setProject(this._project);
		}
		return clonedResource;
	}

	/**
	 * Locate resources by glob.
	 *
	 * @param patterns array of glob patterns
	 * @param [options] glob options
	 * @param [options.nodir] Do not match directories
	 * @param _trace Trace instance
	 * @returns Promise resolving to list of resources
	 */
	async _runGlob(patterns: string[], options = {nodir: true}, _trace: Trace) {
		if (patterns[0] === "" && !options.nodir) { // Match virtual root directory
			return [
				this._createResource({
					project: this._project,
					statInfo: { // TODO: make closer to fs stat info
						isDirectory: function () {
							return true;
						},
					},
					sourceMetadata: {
						adapter: ADAPTER_NAME,
					},
					path: this._virBasePath.slice(0, -1),
				}),
			];
		}

		let matchedResources = await this._matchPatterns(patterns, this._virFiles);

		if (!options.nodir) {
			const matchedDirs = await this._matchPatterns(patterns, this._virDirs);
			matchedResources = matchedResources.concat(matchedDirs);
		}

		return matchedResources;
	}

	/**
	 * Locates resources by path.
	 *
	 * @param virPath Virtual path
	 * @param options Options
	 * @param options.nodir Do not match directories
	 * @param trace Trace instance
	 * @returns Promise resolving to a single resource
	 */
	async _byPath(virPath: string, options: {nodir: boolean}, trace: Trace) {
		const relPath = this._resolveVirtualPathToBase(virPath);
		if (relPath === null) {
			return null;
		}

		trace.pathCall();

		const resource: Resource = this._virFiles[relPath];

		if (!resource || (options.nodir && resource.getStatInfo().isDirectory?.())) {
			return null;
		} else {
			return await this._cloneResource(resource);
		}
	}

	/**
	 * Writes the content of a resource to a path.
	 *
	 * @param anyResource The Resource to write
	 * @returns Promise resolving once data has been written
	 */
	async _write(anyResource: Resource | LegacyResource) {
		const migratedResource = this._migrateResource(anyResource);
		let resource: Resource;
		if (migratedResource instanceof Promise) {
			// Only await if the migrate function returned a promise
			// Otherwise await would automatically create a Promise, causing unwanted overhead
			resource = await migratedResource;
		} else {
			resource = migratedResource;
		}
		this._assignProjectToResource(resource);
		const relPath = this._resolveVirtualPathToBase(resource.getPath(), true);
		log.silly(`Writing to virtual path ${resource.getPath()}`);
		this._virFiles[relPath] = await resource.clone();

		// Add virtual directories for all path segments of the written resource
		// TODO: Add tests for all this
		const pathSegments = relPath.split("/");
		pathSegments.pop(); // Remove last segment representing the resource itself

		pathSegments.forEach((segment, i) => {
			if (i >= 1) {
				segment = pathSegments[i - 1] + "/" + segment;
			}
			pathSegments[i] = segment;
		});

		for (let i = pathSegments.length - 1; i >= 0; i--) {
			const segment = pathSegments[i];
			if (!this._virDirs[segment]) {
				this._virDirs[segment] = this._createResource({
					project: this._project,
					sourceMetadata: {
						adapter: ADAPTER_NAME,
					},
					statInfo: { // TODO: make closer to fs stat info
						isDirectory: function () {
							return true;
						},
					},
					path: this._virBasePath + segment,
				});
			}
		}
	}
}

export default Memory;

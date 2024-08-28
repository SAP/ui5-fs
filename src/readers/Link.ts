import AbstractReader from "../AbstractReader.js";
import ResourceFacade from "../ResourceFacade.js";
import {prefixGlobPattern} from "../resourceFactory.js";
import {getLogger} from "@ui5/logger";
const log = getLogger("resources:readers:Link");
import Trace from "../tracing/Trace.js";

export interface Link_Params {reader: AbstractReader; pathMapping: {linkPath: string; targetPath: string}};

/**
 * A reader that allows for rewriting paths segments of all resources passed through it.
 *
 * @example
 * import Link from "@ui5/fs/readers/Link";
 * const linkedReader = new Link({
 *     reader: sourceReader,
 *     pathMapping: {
 *          linkPath: `/app`,
 *          targetPath: `/resources/my-app-name/`
 *      }
 * });
 *
 * // The following resolves with a @ui5/fs/ResourceFacade of the resource
 * // located at "/resources/my-app-name/Component.js" in the sourceReader
 * const resource = await linkedReader.byPath("/app/Component.js");
 *
 * @alias @ui5/fs/readers/Link
 */
class Link extends AbstractReader {
	_reader: AbstractReader;

	/**
	 * Path mapping for a [Link]{@link @ui5/fs/readers/Link}
	 *
	 * linkPath Path to match and replace in the requested path or pattern
	 *
	 * targetPath Path to use as a replacement in the request for the source reader
	 */
	_pathMapping: {linkPath: string; targetPath: string};

	/**
	 * Constructor
	 *
	 * @param parameters Parameters
	 * @param parameters.reader The resource reader or collection to wrap
	 * @param parameters.pathMapping Path mapping for a [Link]{@link @ui5/fs/readers/Link}
	 * @param parameters.pathMapping.linkPath Path to match and replace in the requested path or pattern
	 * @param parameters.pathMapping.targetPath Path to use as a replacement in the request for the source reader
	 */
	constructor({reader, pathMapping}: Link_Params) {
		super();
		if (!reader) {
			throw new Error(`Missing parameter "reader"`);
		}
		if (!pathMapping) {
			throw new Error(`Missing parameter "pathMapping"`);
		}
		this._reader = reader;
		this._pathMapping = pathMapping;
		Link._validatePathMapping(pathMapping);
	}

	/**
	 * Locates resources by glob.
	 *
	 * @param pattern glob pattern as string or an array of
	 *         glob patterns for virtual directory structure
	 * @param options glob options
	 * @param options.nodir Do not match directories
	 * @param trace Trace instance
	 * @returns Promise resolving to list of resources
	 */
	async _byGlob(pattern: string | string[], options: {nodir: boolean}, trace: Trace) {
		if (!(pattern instanceof Array)) {
			pattern = [pattern];
		}

		pattern = pattern.flatMap((pattern) => {
			if (pattern.startsWith(this._pathMapping.linkPath)) {
				pattern = pattern.substr(this._pathMapping.linkPath.length);
			}
			return prefixGlobPattern(pattern, this._pathMapping.targetPath);
		});

		// Flatten prefixed patterns
		pattern = Array.prototype.concat.apply([], pattern);

		// Keep resource's internal path unchanged for now
		const resources = await this._reader._byGlob(pattern, options, trace);

		return resources
			.map((resource) => {
				const resourcePath = resource.getPath();
				if (resourcePath.startsWith(this._pathMapping.targetPath)) {
					return new ResourceFacade({
						resource,
						path: this._pathMapping.linkPath + resourcePath.substr(this._pathMapping.targetPath.length),
					});
				}
			})
			.filter((resource) => resource !== undefined);
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
		if (!virPath.startsWith(this._pathMapping.linkPath)) {
			return null;
		}
		const targetPath = this._pathMapping.targetPath + virPath.substr(this._pathMapping.linkPath.length);
		log.silly(`byPath: Rewriting virtual path ${virPath} to ${targetPath}`);

		const resource = await this._reader._byPath(targetPath, options, trace);
		if (resource) {
			return new ResourceFacade({
				resource,
				path: this._pathMapping.linkPath + resource.getPath().substr(this._pathMapping.targetPath.length),
			});
		}
		return null;
	}

	static _validatePathMapping({linkPath, targetPath}: {linkPath: string; targetPath: string}) {
		if (!linkPath) {
			throw new Error(`Path mapping is missing attribute "linkPath"`);
		}
		if (!targetPath) {
			throw new Error(`Path mapping is missing attribute "targetPath"`);
		}
		if (!linkPath.endsWith("/")) {
			throw new Error(`Link path must end with a slash: ${linkPath}`);
		}
		if (!targetPath.endsWith("/")) {
			throw new Error(`Target path must end with a slash: ${targetPath}`);
		}
	}
}

export default Link;

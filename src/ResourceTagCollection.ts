const tagNamespaceRegExp = /^[a-z][a-z0-9]+$/; // part before the colon
const tagNameRegExp = /^[A-Z][A-Za-z0-9]+$/; // part after the colon
import {ResourceInterface} from "./Resource.js";
import ResourceFacade from "./ResourceFacade.js";

interface PathTagsInterface {
	[key: string]: string | number | boolean | undefined | PathTagsInterface;
};
/**
 *
 * @param elem Variable to test if it's with a PathTagsInterface type
 */
export function isPathTagsInterface(elem: unknown): elem is PathTagsInterface {
	return typeof elem === "object";
}

/**
 * A ResourceTagCollection
 *
 * @alias @ui5/fs/internal/ResourceTagCollection
 */
class ResourceTagCollection {
	_allowedTags: string[];
	_allowedNamespaces: string[];
	_pathTags: PathTagsInterface;
	_allowedNamespacesRegExp: null | RegExp;

	constructor({allowedTags = [], allowedNamespaces = [], tags}:
		{allowedTags?: string[]; allowedNamespaces?: string[]; tags?: PathTagsInterface}) {
		this._allowedTags = allowedTags; // Allowed tags are validated during use
		this._allowedNamespaces = allowedNamespaces;

		if (allowedNamespaces.length) {
			let allowedNamespacesRegExp = allowedNamespaces.reduce((regex, tagNamespace, idx) => {
				// Ensure alphanum namespace to ensure working regex
				if (!tagNamespaceRegExp.test(tagNamespace)) {
					throw new Error(`Invalid namespace ${tagNamespace}: ` +
						`Namespace must be alphanumeric, lowercase and start with a letter`);
				}
				return `${regex}${idx === 0 ? "" : "|"}${tagNamespace}`;
			}, "^(?:");
			allowedNamespacesRegExp += "):.+$";
			this._allowedNamespacesRegExp = new RegExp(allowedNamespacesRegExp);
		} else {
			this._allowedNamespacesRegExp = null;
		}

		this._pathTags = tags ?? Object.create(null) as PathTagsInterface;
	}

	setTag(resourcePath: ResourceInterface | string, tag: string, value: string | number | boolean = true) {
		resourcePath = this._getPath(resourcePath);
		this._validateTag(tag);
		this._validateValue(value);

		if (!this._pathTags[resourcePath]) {
			this._pathTags[resourcePath] = Object.create(null) as PathTagsInterface;
		}

		const pointer = this._pathTags[resourcePath];
		if (isPathTagsInterface(pointer)) {
			pointer[tag] = value;
		}
	}

	clearTag(resourcePath: ResourceInterface | string, tag: string) {
		resourcePath = this._getPath(resourcePath);
		this._validateTag(tag);

		const pointer = this._pathTags[resourcePath];
		if (isPathTagsInterface(pointer)) {
			pointer[tag] = undefined;
		}
	}

	getTag(resourcePath: ResourceInterface | string,
		tag: string): string | number | boolean | undefined | PathTagsInterface {
		resourcePath = this._getPath(resourcePath);
		this._validateTag(tag);

		const pointer = this._pathTags[resourcePath];
		if (isPathTagsInterface(pointer)) {
			return pointer[tag];
		}
	}

	getAllTags() {
		return this._pathTags;
	}

	acceptsTag(tag: string) {
		if (this._allowedTags.includes(tag) || this._allowedNamespacesRegExp?.test(tag)) {
			return true;
		}
		return false;
	}

	_getPath(resourcePath: ResourceInterface | string): string {
		if (typeof resourcePath !== "string") {
			if (resourcePath instanceof ResourceFacade) {
				resourcePath = resourcePath.getConcealedResource().getPath();
			} else {
				resourcePath = resourcePath.getPath();
			}
		}
		if (!resourcePath) {
			throw new Error(`Invalid Resource: Resource path must not be empty`);
		}
		return resourcePath;
	}

	_validateTag(tag: string) {
		if (!tag.includes(":")) {
			throw new Error(`Invalid Tag "${tag}": Colon required after namespace`);
		}
		const parts = tag.split(":");
		if (parts.length > 2) {
			throw new Error(`Invalid Tag "${tag}": Expected exactly one colon but found ${parts.length - 1}`);
		}

		const [tagNamespace, tagName] = parts;
		if (!tagNamespaceRegExp.test(tagNamespace)) {
			throw new Error(
				`Invalid Tag "${tag}": Namespace part must be alphanumeric, lowercase and start with a letter`);
		}
		if (!tagNameRegExp.test(tagName)) {
			throw new Error(`Invalid Tag "${tag}": Name part must be alphanumeric and start with a capital letter`);
		}

		if (!this.acceptsTag(tag)) {
			throw new Error(
				`Tag "${tag}" not accepted by this collection. Accepted tags are: ` +
				`${this._allowedTags.join(", ") || "*none*"}. Accepted namespaces are: ` +
				`${this._allowedNamespaces.join(", ") || "*none*"}`);
		}
	}

	_validateValue(value: string | number | boolean) {
		const type = typeof value;
		if (!["string", "number", "boolean"].includes(type)) {
			throw new Error(
				`Invalid Tag Value: Must be of type string, number or boolean but is ${type}`);
		}
	}
}

export default ResourceTagCollection;

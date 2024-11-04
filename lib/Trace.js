import AbstractReader from "./AbstractReader.js";

export default class Trace extends AbstractReader {
	#reader;
	#sealed = false;
	#resourcesIn = [];
	#resourcesInPatterns = [];

	constructor(reader) {
		super(reader.getName());
		this.#reader = reader;
	}

	getTrace() {
		this.#sealed = true;
		return {
			resourcesIn: this.#resourcesIn,
			resourcesInPatterns: this.#resourcesInPatterns,
		};
	}

	async _byGlob(virPattern, options, trace) {
		if (this.#sealed) {
			throw new Error(`Unexpected read operation after reader has been sealed`);
		}
		if (this.#reader.resolvePattern) {
			const resolvedPattern = this.#reader.resolvePattern(virPattern);
			this.#resourcesInPatterns.push(resolvedPattern);
		} else if (virPattern instanceof Array) {
			for (const pattern of virPattern) {
				this.#resourcesInPatterns.push(pattern);
			}
		} else {
			this.#resourcesInPatterns.push(virPattern);
		}
		return await this.#reader._byGlob(virPattern, options, trace);
	}

	async _byPath(virPath, options, trace) {
		if (this.#sealed) {
			throw new Error(`Unexpected read operation after reader has been sealed`);
		}
		if (this.#reader.resolvePath) {
			const resolvedPath = this.#reader.resolvePath(virPath);
			if (resolvedPath) {
				this.#resourcesIn.push(resolvedPath);
			}
		} else {
			this.#resourcesIn.push(virPath);
		}
		return await this.#reader._byPath(virPath, options, trace);
	}
}

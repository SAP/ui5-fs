import AbstractReaderWriter from "./AbstractReaderWriter.js";

export default class Trace extends AbstractReaderWriter {
	#readerWriter;
	#sealed = false;
	#resourcesIn = [];
	#resourcesInPatterns = [];
	#resourcesOut = [];

	constructor(readerWriter) {
		super(readerWriter.getName());
		this.#readerWriter = readerWriter;
	}

	getTrace() {
		this.#sealed = true;
		return {
			resourcesIn: this.#resourcesIn,
			resourcesInPatterns: this.#resourcesInPatterns,
			resourcesOut: this.#resourcesOut,
		};
	}

	async _byGlob(virPattern, options, trace) {
		if (this.#sealed) {
			throw new Error(`Unexpected read operation after reader has been sealed`);
		}
		if (this.#readerWriter.resolvePattern) {
			const resolvedPattern = this.#readerWriter.resolvePattern(virPattern);
			this.#resourcesInPatterns.push(resolvedPattern);
		} else if (virPattern instanceof Array) {
			for (const pattern of virPattern) {
				this.#resourcesInPatterns.push(pattern);
			}
		} else {
			this.#resourcesInPatterns.push(virPattern);
		}
		return await this.#readerWriter._byGlob(virPattern, options, trace);
	}

	async _byPath(virPath, options, trace) {
		if (this.#sealed) {
			throw new Error(`Unexpected read operation after reader has been sealed`);
		}
		if (this.#readerWriter.resolvePath) {
			const resolvedPath = this.#readerWriter.resolvePath(virPath);
			if (resolvedPath) {
				this.#resourcesIn.push(resolvedPath);
			}
		} else {
			this.#resourcesIn.push(virPath);
		}
		return await this.#readerWriter._byPath(virPath, options, trace);
	}

	_write(resource, dependencies) {
		if (this.#sealed) {
			throw new Error(`Unexpected write operation after writer has been sealed`);
		}
		this.#resourcesOut.push(resource.getOriginalPath());
		return this.#readerWriter.write(resource);
	}
}

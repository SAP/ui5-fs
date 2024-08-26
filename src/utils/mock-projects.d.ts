// TODO: This file is meant only for temp resolve of the UI5 tooling
// dependencies, until they got migrated and we can have the real TS definitions

declare module "@ui5/project/specifications/Project" {

	export interface Project {
		getName: () => string;
		getType: () => "project" | "application" | "library";
	}
}

declare module "@ui5/logger" {
	interface logger {
		silly(x: string): void;
		verbose(x: string): void;
		isLevelEnabled(x: string): boolean;
	}

	export function getLogger(x: string): logger;
}

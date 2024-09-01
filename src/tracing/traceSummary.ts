import {getLogger} from "@ui5/logger";
const log = getLogger("resources:tracing:total");

import prettyHrtime from "pretty-hrtime";
let timeoutId: NodeJS.Timeout;
let active = false;
let tracesRunning = 0;

export type CollectionsType = Record<string, Record<string, number>>;

let traceData: null | {
	startTime: [number, number];
	pathCalls: number;
	globCalls: number;
	collections: CollectionsType;
	traceCalls: number;
	timeDiff?: [number, number];
};

/**
 *
 */
function init() {
	traceData = {
		startTime: process.hrtime(),
		pathCalls: 0,
		globCalls: 0,
		collections: {},
		traceCalls: 0,
	};
	active = true;
}

/**
 *
 */
function reset() {
	traceData = null;
	active = false;
}

/**
 *
 */
function report() {
	let report = "";

	if (!traceData) {
		return;
	}

	const time = prettyHrtime(traceData.timeDiff!);
	const colCount = Object.keys(traceData.collections).length;

	report += "==========================\n[=> TRACE SUMMARY:\n";
	report += `  ${time} elapsed time \n`;
	report += `  ${traceData.traceCalls} trace calls \n`;
	if (traceData.globCalls) {
		report += `  ${traceData.globCalls} glob executions\n`;
	}
	if (traceData.pathCalls) {
		report += `  ${traceData.pathCalls} path stats\n`;
	}
	report += `  ${colCount} rl-collections involed:\n`;

	for (const coll in traceData.collections) {
		if (Object.prototype.hasOwnProperty.call(traceData.collections, coll)) {
			report += `      ${traceData.collections[coll].calls}x ${coll}\n`;
		}
	}
	report += "======================]";
	log.silly(report);
}

/**
 *
 */
function someTraceStarted() {
	if (!log.isLevelEnabled("silly")) {
		return;
	}
	if (!traceData) {
		init();
	}
	tracesRunning++;
	traceData!.traceCalls++;

	if (timeoutId) {
		clearTimeout(timeoutId);
	}
}

/**
 *
 */
function someTraceEnded(): Promise<void> {
	return new Promise(function (resolve) {
		if (!active) {
			resolve();
			return;
		}
		tracesRunning--;
		if (tracesRunning > 0) {
			resolve();
			return;
		}

		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		traceData!.timeDiff = process.hrtime(traceData!.startTime);
		timeoutId = setTimeout(function () {
			report();
			reset();
			resolve();
		}, 2000);
	});
}

/**
 *
 */
function pathCall() {
	if (!active) {
		return;
	}
	if (traceData) {
		traceData.pathCalls++;
	}
}

/**
 *
 */
function globCall() {
	if (!active) {
		return;
	}

	if (traceData) {
		traceData.globCalls++;
	}
}

/**
 *
 * @param name TraceData collection name
 */
function collection(name: string) {
	if (!active || !traceData) {
		return;
	}
	const collection = traceData.collections[name];
	if (collection) {
		traceData.collections[name].calls++;
	} else {
		traceData.collections[name] = {
			calls: 1,
		};
	}
}

export default {
	pathCall: pathCall,
	globCall: globCall,
	collection: collection,
	traceStarted: someTraceStarted,
	traceEnded: someTraceEnded,
};

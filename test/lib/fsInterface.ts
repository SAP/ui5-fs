import test from "ava";
import {promisify} from "node:util";
import {Buffer} from "node:buffer";
import path from "node:path";
import {fileURLToPath} from "node:url";
import fsSync from "node:fs";
const stat = promisify(fsSync.stat);
import {readFile} from "node:fs/promises";
import fsInterface from "../../lib/fsInterface.js";
import MemAdapter from "../../lib/adapters/Memory.js";
import FsAdapter from "../../lib/adapters/FileSystem.js";
import Resource from "../../lib/Resource.js";

const assertReadFile = async (t, readFile, basepath, filepath, content) => {
	content = content || "content of " + filepath;
	const fullpath = path.join(basepath, filepath);
	let buffer = await readFile(fullpath);
	t.true(Buffer.isBuffer(buffer));
	t.deepEqual(buffer.toString(), content);

	buffer = await readFile(fullpath, {});
	t.true(Buffer.isBuffer(buffer));
	t.deepEqual(buffer.toString(), content);
	buffer = await readFile(fullpath, {encoding: null});
	t.true(Buffer.isBuffer(buffer));
	t.deepEqual(buffer.toString(), content);
	buffer = await readFile(fullpath, "utf8");
	t.is(typeof buffer, "string");
	t.deepEqual(buffer, content);

	buffer = await readFile(fullpath, {encoding: "utf8"});
	t.is(typeof buffer, "string");
	t.deepEqual(content, content);
};

function getPath() {
	return fileURLToPath(new URL("../fixtures/fsInterfáce", import.meta.url));
}

test("MemAdapter: readFile", async (t) => {
	const memAdapter = new MemAdapter({
		virBasePath: "/"
	});
	const fs = fsInterface(memAdapter);
	const readFile = promisify(fs.readFile);

	const fsPath = path.join("/", "foo.txt");
	await memAdapter.write(new Resource({
		path: "/foo.txt",
		string: `content of ${fsPath}`
	}));
	`content of ${fsPath}`;
	await assertReadFile(t, readFile, "", fsPath);
});

test("FsAdapter: readFile with non-ASCII characters in path", async (t) => {
	const fsAdapter = new FsAdapter({
		virBasePath: "/",
		fsBasePath: getPath()
	});
	const fs = fsInterface(fsAdapter);
	const readFile = promisify(fs.readFile);

	await assertReadFile(t, readFile, "", path.join("/", "bâr.txt"), "content");
});

test("fs: readFile", async (t) => {
	await assertReadFile(t, readFile,
		getPath(), path.join("/", "foo.txt"), "content");
});

const assertStat = async (t, stat, basepath, filepath) => {
	const fullpath = path.join(basepath, filepath);
	const stats = await stat(fullpath);

	t.is(stats.isFile(), true);
	t.is(stats.isDirectory(), false);
	t.is(stats.isBlockDevice(), false);
	t.is(stats.isCharacterDevice(), false);
	t.is(stats.isSymbolicLink(), false);
	t.is(stats.isFIFO(), false);
	t.is(stats.isSocket(), false);
};

test("MemAdapter: stat", async (t) => {
	const memAdapter = new MemAdapter({
		virBasePath: "/"
	});
	const fs = fsInterface(memAdapter);
	const stat = promisify(fs.stat);

	const fsPath = path.join("/", "foo.txt");
	await memAdapter.write(new Resource({
		path: "/foo.txt",
		string: `content of ${fsPath}`
	}));
	await assertStat(t, stat, "", fsPath);
});

test("FsAdapter: stat", async (t) => {
	const fsAdapter = new FsAdapter({
		virBasePath: "/",
		fsBasePath: getPath()
	});
	const fs = fsInterface(fsAdapter);
	const stat = promisify(fs.stat);

	await assertStat(t, stat, "", path.join("/", "foo.txt"));
});

test("fs: stat", async (t) => {
	await assertStat(t, stat, getPath(), path.join("/", "foo.txt"));
});

test("MemAdapter: mkdir", async (t) => {
	const memAdapter = new MemAdapter({
		virBasePath: "/"
	});
	const fs = fsInterface(memAdapter);
	const mkdir = promisify(fs.mkdir);

	await t.notThrowsAsync(mkdir("pony"), "mkdir executes successfully");
});

import test from "ava";
import {Stream, Transform, type Readable} from "node:stream";
import {promises as fs, createReadStream} from "node:fs";
import path from "node:path";
import Resource from "../../src/Resource.js";
import type {Project} from "@ui5/project/specifications/Project";

function createBasicResource() {
	const fsPath = path.join("test", "fixtures", "application.a", "webapp", "index.html");
	const resource = new Resource({
		path: "/app/index.html",
		createStream: function () {
			return createReadStream(fsPath);
		},
		project: {} as Project,
		statInfo: {},
	});
	return resource;
}

/**
 * Reads a readable stream and resolves with its content
 *
 * @param {stream.Readable} readableStream readable stream
 * @returns {Promise<string>} resolves with the read string
 */
const readStream = (readableStream: Readable) => {
	return new Promise((resolve, reject) => {
		let streamedResult = "";
		readableStream.on("data", (chunk: string) => {
			streamedResult += chunk;
		});
		readableStream.on("end", () => {
			resolve(streamedResult);
		});
		readableStream.on("error", (err: Error) => {
			reject(err);
		});
	});
};

test("Resource: constructor with missing path parameter", (t) => {
	t.throws(() => {
		// @ts-expect-error testing missing arguments
		new Resource({});
	}, {
		instanceOf: Error,
		message: "Unable to create Resource: Missing parameter 'path'",
	});
});

test("Resource: constructor with duplicated content parameter", (t) => {
	const fsPath = path.join("test", "fixtures", "application.a", "webapp", "index.html");
	[{
		path: "/my/path",
		buffer: Buffer.from("Content"),
		string: "Content",
	}, {
		path: "/my/path",
		buffer: Buffer.from("Content"),
		stream: createReadStream(fsPath),
	}, {
		path: "/my/path",
		buffer: Buffer.from("Content"),
		createStream: () => {
			return createReadStream(fsPath);
		},
	}, {
		path: "/my/path",
		string: "Content",
		stream: createReadStream(fsPath),
	}, {
		path: "/my/path",
		string: "Content",
		createStream: () => {
			return createReadStream(fsPath);
		},
	}, {
		path: "/my/path",
		stream: createReadStream(fsPath),
		createStream: () => {
			return createReadStream(fsPath);
		},
	}].forEach((resourceParams) => {
		t.throws(() => {
			new Resource(resourceParams);
		}, {
			instanceOf: Error,
			message: "Unable to create Resource: Please set only one content parameter. " +
			"'buffer', 'string', 'stream' or 'createStream'",
		}, "Threw with expected error message");
	});
});

test("Resource: From buffer", async (t) => {
	const resource = new Resource({
		path: "/my/path",
		buffer: Buffer.from("Content"),
	});
	t.is(await resource.getSize(), 7, "Content is set");
	t.false(resource.isModified(), "Content of new resource is not modified");
	t.false(resource.getSourceMetadata().contentModified, "Content of new resource is not modified");
});

test("Resource: From string", async (t) => {
	const resource = new Resource({
		path: "/my/path",
		string: "Content",
	});
	t.is(await resource.getSize(), 7, "Content is set");
	t.false(resource.isModified(), "Content of new resource is not modified");
	t.false(resource.getSourceMetadata().contentModified, "Content of new resource is not modified");
});

test("Resource: From stream", async (t) => {
	const fsPath = path.join("test", "fixtures", "application.a", "webapp", "index.html");
	const resource = new Resource({
		path: "/my/path",
		stream: createReadStream(fsPath),
	});
	t.is(await resource.getSize(), 91, "Content is set");
	t.false(resource.isModified(), "Content of new resource is not modified");
	t.false(resource.getSourceMetadata().contentModified, "Content of new resource is not modified");
});

test("Resource: From createStream", async (t) => {
	const fsPath = path.join("test", "fixtures", "application.a", "webapp", "index.html");
	const resource = new Resource({
		path: "/my/path",
		createStream: () => {
			return createReadStream(fsPath);
		},
	});
	t.is(await resource.getSize(), 91, "Content is set");
	t.false(resource.isModified(), "Content of new resource is not modified");
	t.false(resource.getSourceMetadata().contentModified, "Content of new resource is not modified");
});

test("Resource: Source metadata", async (t) => {
	const resource = new Resource({
		path: "/my/path",
		string: "Content",
		sourceMetadata: {
			adapter: "My Adapter",
			fsPath: "/some/path",
		},
	});
	t.is(await resource.getSize(), 7, "Content is set");
	t.false(resource.isModified(), "Content of new resource is not modified");
	t.false(resource.getSourceMetadata().contentModified, "Content of new resource is not modified");
	t.is(resource.getSourceMetadata().adapter, "My Adapter", "Correct source metadata 'adapter' value");
	t.is(resource.getSourceMetadata().fsPath, "/some/path", "Correct source metadata 'fsPath' value");
});
test("Resource: Source metadata with modified content", async (t) => {
	const resource = new Resource({
		path: "/my/path",
		string: "Content",
		sourceMetadata: {
			adapter: "My Adapter",
			fsPath: "/some/path",
			contentModified: true,
		},
	});
	t.is(await resource.getSize(), 7, "Content is set");
	t.false(resource.isModified(), "Content of new resource is not modified");
	t.true(resource.getSourceMetadata().contentModified, "Content of new resource is already modified");
	t.is(resource.getSourceMetadata().adapter, "My Adapter", "Correct source metadata 'adapter' value");
	t.is(resource.getSourceMetadata().fsPath, "/some/path", "Correct source metadata 'fsPath' value");
});

test("Resource: Illegal source metadata attribute", (t) => {
	t.throws(() => {
		new Resource({
			path: "/my/path",
			string: "Content",
			sourceMetadata: {
				adapter: "My Adapter",
				fsPath: "/some/path",
				// @ts-expect-error testing invalid value
				pony: "🦄",
			},
		});
	}, {
		message: `Parameter 'sourceMetadata' contains an illegal attribute: pony`,
	}, "Threw with expected error message");
});

test("Resource: Illegal source metadata value", (t) => {
	t.throws(() => {
		new Resource({
			path: "/my/path",
			string: "Content",
			// @ts-expect-error testing invalid value
			sourceMetadata: {
				adapter: "My Adapter",
				fsPath: {
					some: "value",
				},
			},
		});
	}, {
		message: `Attribute 'fsPath' of parameter 'sourceMetadata' must be of type "string" or "boolean"`,
	}, "Threw with expected error message");
});

test("Resource: getBuffer with throwing an error", (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "/my/path/to/resource",
	});

	return resource.getBuffer().catch(function (error) {
		t.is(error.message, "Resource /my/path/to/resource has no content",
			"getBuffer called w/o having a resource content provided");
	});
});

test("Resource: getPath / getName", (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource.js",
		buffer: Buffer.from("Content"),
	});
	t.is(resource.getPath(), "/my/path/to/resource.js", "Correct path");
	t.is(resource.getName(), "resource.js", "Correct name");
});

test("Resource: setPath / getName", (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource.js",
		buffer: Buffer.from("Content"),
	});
	resource.setPath("/my/other/file.json");
	t.is(resource.getPath(), "/my/other/file.json", "Correct path");
	t.is(resource.getName(), "file.json", "Correct name");
});

test("Resource: setPath with non-absolute path", (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource.js",
		buffer: Buffer.from("Content"),
	});
	t.throws(() => {
		resource.setPath("my/other/file.json");
	}, {
		message: "Unable to set resource path: Path must be absolute: my/other/file.json",
	}, "Threw with expected error message");
	t.is(resource.getPath(), "/my/path/to/resource.js", "Path is unchanged");
	t.is(resource.getName(), "resource.js", "Name is unchanged");
});

test("Create Resource with non-absolute path", (t) => {
	t.throws(() => {
		new Resource({
			path: "my/path/to/resource.js",
			buffer: Buffer.from("Content"),
		});
	}, {
		message: "Unable to set resource path: Path must be absolute: my/path/to/resource.js",
	}, "Threw with expected error message");
});

test("Resource: getStream", async (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "/my/path/to/resource",
		buffer: Buffer.from("Content"),
	});

	const result = await readStream(resource.getStream());
	t.is(result, "Content", "Stream has been read correctly");
});

test("Resource: getStream for empty string", async (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "/my/path/to/resource",
		string: "",
	});

	const result = await readStream(resource.getStream());
	t.is(result, "", "Stream has been read correctly for empty string");
});

test("Resource: getStream for empty string instance", async (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "/my/path/to/resource",

		string: new String("") as string,
	});

	const result = await readStream(resource.getStream());
	t.is(result, "", "Stream has been read correctly for empty string");
});

test("Resource: getStream throwing an error", (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
	});

	t.throws(() => {
		resource.getStream();
	}, {
		instanceOf: Error,
		message: "Resource /my/path/to/resource has no content",
	});
});

test("Resource: setString", async (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
		sourceMetadata: {}, // Needs to be passed in order to get the "modified" state
	});

	t.is(resource.getSourceMetadata().contentModified, false, "sourceMetadata modified flag set correctly");
	t.false(resource.isModified(), "Resource is not modified");

	resource.setString("Content");

	t.is(resource.getSourceMetadata().contentModified, true, "sourceMetadata modified flag updated correctly");
	t.true(resource.isModified(), "Resource is modified");

	const value = await resource.getString();
	t.is(value, "Content", "String set");
});

test("Resource: setBuffer", async (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
		sourceMetadata: {}, // Needs to be passed in order to get the "modified" state
	});

	t.is(resource.getSourceMetadata().contentModified, false, "sourceMetadata modified flag set correctly");
	t.false(resource.isModified(), "Resource is not modified");

	resource.setBuffer(Buffer.from("Content"));

	t.is(resource.getSourceMetadata().contentModified, true, "sourceMetadata modified flag updated correctly");
	t.true(resource.isModified(), "Resource is modified");

	const value = await resource.getString();
	t.is(value, "Content", "String set");
});

test("Resource: size modification", async (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
	});
	t.is(await resource.getSize(), 0, "initial size without content");

	// string
	resource.setString("Content");

	t.is(await resource.getSize(), 7, "size after manually setting the string");
	t.is(await new Resource({
		path: "/my/path/to/resource",
		string: "Content",
	}).getSize(), 7, "size when passing string to constructor");

	// buffer
	resource.setBuffer(Buffer.from("Super"));

	t.is(await resource.getSize(), 5, "size after manually setting the string");

	const clonedResource1 = await resource.clone();
	t.is(await clonedResource1.getSize(), 5, "size after cloning the resource");

	// buffer with alloc
	const buf = Buffer.alloc(1234);
	buf.write("some string", 0, "utf8");
	resource.setBuffer(buf);

	t.is(await resource.getSize(), 1234, "buffer with alloc after setting the buffer");
	t.is(await new Resource({
		path: "/my/path/to/resource",
		buffer: buf,
	}).getSize(), 1234, "buffer with alloc when passing buffer to constructor");

	const clonedResource2 = await resource.clone();
	t.is(await clonedResource2.getSize(), 1234, "buffer with alloc after clone");

	// stream
	const streamResource = new Resource({
		path: "/my/path/to/resource",
	});
	const stream = new Stream.Readable();
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	stream._read = function () {};
	stream.push("I am a ");
	stream.push("readable ");
	stream.push("stream!");
	stream.push(null);

	streamResource.setStream(stream);

	// stream is read and stored in buffer
	// test parallel size retrieval
	const [size1, size2] = await Promise.all([streamResource.getSize(), streamResource.getSize()]);
	t.is(size1, 23, "size for streamResource, parallel 1");
	t.is(size2, 23, "size for streamResource, parallel 2");
	t.is(await streamResource.getSize(), 23, "size for streamResource read again");
});

test("Resource: setStream (Stream)", async (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
		sourceMetadata: {}, // Needs to be passed in order to get the "modified" state
	});

	t.is(resource.getSourceMetadata().contentModified, false, "sourceMetadata modified flag set correctly");
	t.false(resource.isModified(), "Resource is not modified");

	const stream = new Stream.Readable();
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	stream._read = function () {};
	stream.push("I am a ");
	stream.push("readable ");
	stream.push("stream!");
	stream.push(null);

	resource.setStream(stream);

	t.is(resource.getSourceMetadata().contentModified, true, "sourceMetadata modified flag updated correctly");
	t.true(resource.isModified(), "Resource is modified");

	const value = await resource.getString();
	t.is(value, "I am a readable stream!", "Stream set correctly");
});

test("Resource: setStream (Create stream callback)", async (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
		sourceMetadata: {}, // Needs to be passed in order to get the "modified" state
	});

	t.is(resource.getSourceMetadata().contentModified, false, "sourceMetadata modified flag set correctly");
	t.false(resource.isModified(), "Resource is not modified");

	resource.setStream(() => {
		const stream = new Stream.Readable();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		stream._read = function () {};
		stream.push("I am a ");
		stream.push("readable ");
		stream.push("stream!");
		stream.push(null);
		return stream;
	});

	t.is(resource.getSourceMetadata().contentModified, true, "sourceMetadata modified flag updated correctly");
	t.true(resource.isModified(), "Resource is modified");

	const value = await resource.getString();
	t.is(value, "I am a readable stream!", "Stream set correctly");
});

test("Resource: clone resource with buffer", async (t) => {
	t.plan(2);

	const resource = new Resource({
		path: "/my/path/to/resource",
		buffer: Buffer.from("Content"),
	});

	const clonedResource = await resource.clone();
	t.pass("Resource cloned");

	const clonedResourceContent = await clonedResource.getString();
	t.is(clonedResourceContent, "Content", "Cloned resource has correct content string");
});

test("Resource: clone resource with stream", async (t) => {
	t.plan(2);

	const resource = new Resource({
		path: "/my/path/to/resource",
	});
	const stream = new Stream.Readable();
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	stream._read = function () {};
	stream.push("Content");
	stream.push(null);

	resource.setStream(stream);

	const clonedResource = await resource.clone();
	t.pass("Resource cloned");

	const clonedResourceContent = await clonedResource.getString();
	t.is(clonedResourceContent, "Content", "Cloned resource has correct content string");
});

test("Resource: clone resource with sourceMetadata", async (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
		sourceMetadata: {
			adapter: "FileSystem",
			fsPath: "/resources/my.js",
		},
	});

	const clonedResource = await resource.clone();

	t.not(resource.getSourceMetadata(), clonedResource.getSourceMetadata(),
		"Clone has de-referenced instance of sourceMetadata");
	t.deepEqual(clonedResource.getSourceMetadata(), {
		adapter: "FileSystem",
		fsPath: "/resources/my.js",
		contentModified: false,
	});

	// Change existing resource and clone
	resource.setString("New Content");

	const clonedResource2 = await resource.clone();

	t.not(clonedResource2.getSourceMetadata(), resource.getSourceMetadata(),
		"Clone has de-referenced instance of sourceMetadata");
	t.deepEqual(clonedResource2.getSourceMetadata(), {
		adapter: "FileSystem",
		fsPath: "/resources/my.js",
		contentModified: true,
	});

	t.true(resource.isModified(), "Original resource is flagged as modified");
	t.false(clonedResource.isModified(), "Cloned resource 1 is not flagged as modified");
	t.false(clonedResource2.isModified(), "Cloned resource 2 is not flagged as modified");
});

test("Resource: clone resource with project removes project", async (t) => {
	const myProject = {
		name: "my project",
	};

	const resource = new Resource({
		path: "/my/path/to/resource",
		project: myProject as unknown as Project,
	});

	const clonedResource = await resource.clone();
	t.pass("Resource cloned");

	const clonedResourceProject = clonedResource.getProject();
	t.falsy(clonedResourceProject, "Cloned resource should not have a project");
});

test("Resource: create resource with sourceMetadata.contentModified: true", (t) => {
	const resource = new Resource({
		path: "/my/path/to/resource",
		sourceMetadata: {
			adapter: "FileSystem",
			fsPath: "/resources/my.js",
			contentModified: true,
		},
	});

	t.true(resource.getSourceMetadata().contentModified, "Modified flag is still true");
	t.false(resource.isModified(), "Resource is not modified");
});

test("getStream with createStream callback content: Subsequent content requests should throw error due " +
"to drained content", async (t) => {
	const resource = createBasicResource();
	resource.getStream();
	t.throws(() => {
		resource.getStream();
	}, {message: /Content of Resource \/app\/index.html has been drained/});
	await t.throwsAsync(resource.getBuffer(), {message: /Content of Resource \/app\/index.html has been drained/});
	await t.throwsAsync(resource.getString(), {message: /Content of Resource \/app\/index.html has been drained/});
});

test("getStream with Buffer content: Subsequent content requests should throw error due to drained " +
"content", async (t) => {
	const resource = createBasicResource();
	await resource.getBuffer();
	resource.getStream();
	t.throws(() => {
		resource.getStream();
	}, {message: /Content of Resource \/app\/index.html has been drained/});
	await t.throwsAsync(resource.getBuffer(), {message: /Content of Resource \/app\/index.html has been drained/});
	await t.throwsAsync(resource.getString(), {message: /Content of Resource \/app\/index.html has been drained/});
});

test("getStream with Stream content: Subsequent content requests should throw error due to drained " +
"content", async (t) => {
	const resource = createBasicResource();
	const tStream = new Transform({
		transform(chunk, encoding, callback) {
			this.push(chunk.toString());
			callback();
		},
	});
	const stream = resource.getStream();
	stream.pipe(tStream);
	resource.setStream(tStream);

	resource.getStream();
	t.throws(() => {
		resource.getStream();
	}, {message: /Content of Resource \/app\/index.html has been drained/});
	await t.throwsAsync(resource.getBuffer(), {message: /Content of Resource \/app\/index.html has been drained/});
	await t.throwsAsync(resource.getString(), {message: /Content of Resource \/app\/index.html has been drained/});
});

test("getBuffer from Stream content: Subsequent content requests should not throw error due to drained " +
"content", async (t) => {
	const resource = createBasicResource();
	const tStream = new Transform({
		transform(chunk, encoding, callback) {
			this.push(chunk.toString());
			callback();
		},
	});
	const stream = resource.getStream();
	stream.pipe(tStream);
	resource.setStream(tStream);

	const p1 = resource.getBuffer();
	const p2 = resource.getBuffer();

	await t.notThrowsAsync(p1);

	// Race condition in _getBufferFromStream used to cause p2
	// to throw "Content stream of Resource /app/index.html is flagged as drained."
	await t.notThrowsAsync(p2);
});

test("Resource: getProject", (t) => {
	t.plan(1);
	const resource = new Resource({
		path: "/my/path/to/resource",
		project: {getName: () => "Mock Project"} as Project,
	});
	const project = resource.getProject();
	t.is(project!.getName(), "Mock Project");
});

test("Resource: setProject", (t) => {
	t.plan(1);
	const resource = new Resource({
		path: "/my/path/to/resource",
	});
	const project = {getName: () => "Mock Project"} as Project;
	resource.setProject(project);
	t.is(resource.getProject()!.getName(), "Mock Project");
});

test("Resource: reassign with setProject", (t) => {
	t.plan(2);
	const resource = new Resource({
		path: "/my/path/to/resource",
		project: {getName: () => "Mock Project"} as Project,
	});
	const project = {getName: () => "New Mock Project"} as Project;
	const error = t.throws(() => resource.setProject(project));
	t.is(error.message, "Unable to assign project New Mock Project to resource /my/path/to/resource: " +
	"Resource is already associated to project Mock Project");
});

test("Resource: constructor with stream", async (t) => {
	const stream = new Stream.Readable();
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	stream._read = function () {};
	stream.push("I am a ");
	stream.push("readable ");
	stream.push("stream!");
	stream.push(null);

	const resource = new Resource({
		path: "/my/path/to/resource",
		stream,
		sourceMetadata: {}, // Needs to be passed in order to get the "modified" state
	});

	t.is(resource.getSourceMetadata().contentModified, false);

	const value = await resource.getString();
	t.is(value, "I am a readable stream!");

	// modified should still be false although setBuffer is called internally
	t.is(resource.getSourceMetadata().contentModified, false);
});

test("integration stat - resource size", async (t) => {
	const fsPath = path.join("test", "fixtures", "application.a", "webapp", "index.html");
	const statInfo = await fs.stat(fsPath);

	const resource = new Resource({
		path: "/some/path",
		statInfo,
		createStream: () => {
			return createReadStream(fsPath);
		},
	});
	t.is(await resource.getSize(), 91);

	// Setting the same content again should end up with the same size
	resource.setString(await resource.getString());
	t.is(await resource.getSize(), 91);

	resource.setString("myvalue");
	t.is(await resource.getSize(), 7);
});

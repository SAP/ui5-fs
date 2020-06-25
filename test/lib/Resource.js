const test = require("ava");
const Stream = require("stream");
const fs = require("fs");
const path = require("path");
const Resource = require("../../lib/Resource");

function createBasicResource() {
	const fsPath = path.join("test", "fixtures", "application.a", "webapp", "index.html");
	const resource = new Resource({
		path: "/app/index.html",
		createStream: function() {
			return fs.createReadStream(fsPath);
		},
		project: {},
		statInfo: {},
		fsPath
	});
	return resource;
}

/**
 * Reads a readable stream and resolves with its content
 *
 * @param {stream.Readable} readableStream readable stream
 * @returns {Promise<string>} resolves with the read string
 */
const readStream = (readableStream) => {
	return new Promise((resolve, reject) => {
		let streamedResult = "";
		readableStream.on("data", (chunk) => {
			streamedResult += chunk;
		});
		readableStream.on("end", () => {
			resolve(streamedResult);
		});
		readableStream.on("error", (err) => {
			reject(err);
		});
	});
};

test("Resource: constructor with missing path parameter", (t) => {
	t.throws(() => {
		new Resource({});
	}, {
		instanceOf: Error,
		message: "Cannot create Resource: path parameter missing"
	});
});

test("Resource: constructor with duplicated content parameter", (t) => {
	t.throws(() => {
		new Resource({
			path: "my/path",
			buffer: Buffer.from("Content"),
			string: "Content"
		});
	}, {
		instanceOf: Error,
		message: "Cannot create Resource: Please set only one content parameter. " +
			"Buffer, string, stream or createStream"
	});
});

test("Resource: getBuffer with throwing an error", (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource",
	});

	return resource.getBuffer().catch(function(error) {
		t.is(error.message, "Resource my/path/to/resource has no content",
			"getBuffer called w/o having a resource content provided");
	});
});

test("Resource: getStream", async (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource",
		buffer: Buffer.from("Content")
	});

	return readStream(resource.getStream()).then((result) => {
		t.is(result, "Content", "Stream has been read correctly");
	});
});

test("Resource: getStream for empty string", async (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource",
		string: ""
	});

	return readStream(resource.getStream()).then((result) => {
		t.is(result, "", "Stream has been read correctly for empty string");
	});
});

test("Resource: getStream for empty string instance", async (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource",
		// eslint-disable-next-line no-new-wrappers
		string: new String("")
	});

	return readStream(resource.getStream()).then((result) => {
		t.is(result, "", "Stream has been read correctly for empty string");
	});
});

test("Resource: getStream throwing an error", (t) => {
	const resource = new Resource({
		path: "my/path/to/resource"
	});

	t.throws(() => {
		resource.getStream();
	}, {
		instanceOf: Error,
		message: "Resource my/path/to/resource has no content"
	});
});

test("Resource: setString", (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource",
	});

	resource.setString("Content");

	return resource.getString().then(function(value) {
		t.is(value, "Content", "String set");
	});
});

test("Resource: size modification", async (t) => {
	const resource = new Resource({
		path: "my/path/to/resource"
	});
	t.falsy(resource.getStatInfo().size, "initial size is not defined");

	// string
	resource.setString("Content");

	t.is(resource.getStatInfo().size, 7, "size after manually setting the string");
	t.is(new Resource({
		path: "my/path/to/resource",
		string: "Content"
	}).getStatInfo().size, 7, "size when passing string to constructor");


	// buffer
	resource.setBuffer(Buffer.from("Super"));

	t.is(resource.getStatInfo().size, 5, "size after manually setting the string");

	const clonedResource1 = await resource.clone();
	t.is(clonedResource1.getStatInfo().size, 5, "size after cloning the resource");


	// buffer with alloc
	const buf = Buffer.alloc(1234);
	buf.write("some string", 0, "utf8");
	resource.setBuffer(buf);

	t.is(resource.getStatInfo().size, 1234, "buffer with alloc after setting the buffer");
	t.is(new Resource({
		path: "my/path/to/resource",
		buffer: buf
	}).getStatInfo().size, 1234, "buffer with alloc when passing buffer to constructor");

	const clonedResource2 = await resource.clone();
	t.is(clonedResource2.getStatInfo().size, 1234, "buffer with alloc atfer clone");
});

test("Resource: _setSize", (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource"
	});

	resource._setSize(1337);

	t.is(resource.getStatInfo().size, 1337);
});

test("Resource: setStream", (t) => {
	t.plan(1);

	const resource = new Resource({
		path: "my/path/to/resource",
	});
	const stream = new Stream.Readable();
	stream._read = function() {};
	stream.push("I am a ");
	stream.push("readable ");
	stream.push("stream!");
	stream.push(null);

	resource.setStream(stream);

	return resource.getString().then(function(value) {
		t.is(value, "I am a readable stream!", "Stream set correctly");
	});
});

test("Resource: clone resource with buffer", (t) => {
	t.plan(2);

	const resource = new Resource({
		path: "my/path/to/resource",
		buffer: Buffer.from("Content")
	});

	return resource.clone().then(function(clonedResource) {
		t.pass("Resource cloned");
		return clonedResource.getString().then(function(value) {
			t.is(value, "Content", "Cloned resource has correct content string");
		});
	});
});

test("Resource: clone resource with stream", (t) => {
	t.plan(2);

	const resource = new Resource({
		path: "my/path/to/resource"
	});
	const stream = new Stream.Readable();
	stream._read = function() {};
	stream.push("Content");
	stream.push(null);

	resource.setStream(stream);

	return resource.clone().then(function(clonedResource) {
		t.pass("Resource cloned");
		return clonedResource.getString().then(function(value) {
			t.is(value, "Content", "Cloned resource has correct content string");
		});
	});
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
	const {Transform} = require("stream");
	const tStream = new Transform({
		transform(chunk, encoding, callback) {
			this.push(chunk.toString());
			callback();
		}
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
	const {Transform} = require("stream");
	const tStream = new Transform({
		transform(chunk, encoding, callback) {
			this.push(chunk.toString());
			callback();
		}
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

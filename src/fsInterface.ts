import type AbstractReader from "./AbstractReader.js";
import type * as fs from "node:fs";
import {type Buffer} from "node:buffer";

/**
 *
 * @param inputPath Path to convert to POSIX
 */
function toPosix(inputPath: string) {
	return inputPath.replace(/\\/g, "/");
}

// Define the types for the options parameter
type Read_File_Options = {encoding?: string} | string | undefined;

// Define the types for the callback functions
type Read_File_Callback = (err: Error | null, data?: Buffer | string) => void;
type Stat_Callback = (err: Error | null, stats?: fs.Stats) => void;
type Readdir_Callback = (err: Error | null, files?: string[]) => void;
type Mkdir_Callback = (err?: Error | null) => void;

/**
 */
interface File_System_Interface {
	readFile: (fsPath: string, options: Read_File_Options, callback: Read_File_Callback) => void;
	stat: (fsPath: string, callback: Stat_Callback) => void;
	readdir: (fsPath: string, callback: Readdir_Callback) => void;
	mkdir: (fsPath: string, callback: Mkdir_Callback) => void;
};

/**
 * Wraps readers to access them through a [Node.js fs]{@link https://nodejs.org/api/fs.html} styled interface.
 *
 * @param reader Resource Reader or Collection
 *
 * @returns Object with [Node.js fs]{@link https://nodejs.org/api/fs.html} styled functions
 * [<code>readFile</code>]{@link https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback},
 * [<code>stat</code>]{@link https://nodejs.org/api/fs.html#fs_fs_stat_path_options_callback},
 * [<code>readdir</code>]{@link https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback} and
 * [<code>mkdir</code>]{@link https://nodejs.org/api/fs.html#fs_fs_mkdir_path_options_callback}
 */
function fsInterface(reader: AbstractReader) {
	const fileSystem: File_System_Interface = {
		readFile(fsPath, options, callback) {
			if (typeof options === "function") {
				callback = options;
				options = undefined;
			}
			if (typeof options === "string") {
				options = {encoding: options};
			}
			const posixPath = toPosix(fsPath);
			reader.byPath(posixPath, {
				nodir: false,
			}).then(function (resource) {
				if (!resource) {
					const error: NodeJS.ErrnoException =
						new Error(`ENOENT: no such file or directory, open '${fsPath}'`);
					error.code = "ENOENT"; // "File or directory does not exist"
					callback(error);
					return;
				}

				return resource.getBuffer().then(function (buffer) {
					let res;

					if (options?.encoding) {
						res = buffer.toString(options.encoding as BufferEncoding);
					} else {
						res = buffer;
					}

					callback(null, res);
				});
			}).catch(callback);
		},
		stat(fsPath, callback) {
			const posixPath = toPosix(fsPath);
			void reader.byPath(posixPath, {
				nodir: false,
			}).then(function (resource) {
				if (!resource) {
					const error: NodeJS.ErrnoException =
						new Error(`ENOENT: no such file or directory, stat '${fsPath}'`);
					error.code = "ENOENT"; // "File or directory does not exist"
					callback(error);
				} else {
					callback(null, resource.getStatInfo() as fs.StatsBase<number>);
				}
			}).catch(callback);
		},
		readdir(fsPath, callback) {
			let posixPath = toPosix(fsPath);
			if (!(/\/$/.exec(posixPath))) {
				// Add trailing slash if not present
				posixPath += "/";
			}
			void reader.byGlob(posixPath + "*", {
				nodir: false,
			}).then((resources) => {
				const files = resources.map((resource) => {
					return resource.getName();
				});
				callback(null, files);
			}).catch(callback);
		},
		mkdir(_fsPath, callback) {
			setTimeout(callback, 0);
		},
	};

	return fileSystem;
}
export default fsInterface;

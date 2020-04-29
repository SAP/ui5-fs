/**
 * Wraps readers to access them through a [Node.js fs]{@link https://nodejs.org/api/fs.html} styled interface.
 *
 * @public
 * @alias module:@ui5/fs.fsInterface
 * @param {module:@ui5/fs.AbstractReader} reader Resource Reader or Collection
 *
 * @returns {object} Object with [Node.js fs]{@link https://nodejs.org/api/fs.html} styled functions
 * [<code>readFile</code>]{@link https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback},
 * [<code>stat</code>]{@link https://nodejs.org/api/fs.html#fs_fs_stat_path_options_callback},
 * [<code>readdir</code>]{@link https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback} and
 * [<code>mkdir</code>]{@link https://nodejs.org/api/fs.html#fs_fs_mkdir_path_options_callback}
 */
module.exports = (reader) => {
	const slash = require("slash");
	return {
		readFile(fsPath, options, callback) {
			if (typeof options === "function") {
				callback = options;
				options = undefined;
			}
			if (typeof options === "string") {
				options = {encoding: options};
			}
			const posixPath = slash(fsPath);
			reader.byPath(posixPath, {
				nodir: false
			}).then(function(resource) {
				if (!resource) {
					const error = new Error();
					error.code = "ENOENT"; // "File or directory does not exist"
					callback(error);
					return;
				}

				return resource.getBuffer().then(function(buffer) {
					let res;

					if (options && options.encoding) {
						res = buffer.toString(options.encoding);
					} else {
						res = buffer;
					}

					callback(null, res);
				});
			}).catch(callback);
		},
		stat(fsPath, callback) {
			const posixPath = slash(fsPath);
			reader.byPath(posixPath, {
				nodir: false
			}).then(function(resource) {
				if (!resource) {
					const error = new Error();
					error.code = "ENOENT"; // "File or directory does not exist"
					callback(error);
				} else {
					callback(null, resource.getStatInfo());
				}
			}).catch(callback);
		},
		readdir(fsPath, callback) {
			let posixPath = slash(fsPath);
			if (!posixPath.match(/\/$/)) {
				// Add trailing slash if not present
				posixPath += "/";
			}
			reader.byGlob(posixPath + "*", {
				nodir: false
			}).then((resources) => {
				const files = resources.map((resource) => {
					return resource._name;
				});
				callback(null, files);
			}).catch(callback);
		},
		mkdir(fsPath, callback) {
			setTimeout(callback, 0);
		}
	};
};

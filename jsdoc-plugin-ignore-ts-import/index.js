/*
 * Removes JSDoc comments with TypeScript import() declarations
 */

const IMPORT_PATTERN = /{(?:typeof )?import\(["'][^"']*["']\)[ .|}><,)=#\n]/;

exports.handlers = {
	jsdocCommentFound: function(e) {
		if (IMPORT_PATTERN.test(e.comment)) {
			e.comment = "";
		}
	}
};

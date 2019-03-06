"use strict";

const gulp = require("gulp");

// Copy
gulp.task("copy", () => gulp.src("node_modules/highlight.js/styles/railscasts.css").pipe(gulp.dest("./public/editors/apiBrowser/")));

// Browserify
const browserifyTasks = [];
const browserify = require("browserify");
const source = require("vinyl-source-stream");
function makeBrowserify(src, dest, output) {
  gulp.task(`${output}-browserify`, () =>
    browserify(src)
			.transform("brfs").bundle()
			.pipe(source(`${output}.js`))
			.pipe(gulp.dest(dest))
  );
  browserifyTasks.push(`${output}-browserify`);
}

makeBrowserify("./editors/script/typescriptWorker.js", "./public/editors", "script/typescriptWorker");

// All
gulp.task("default", gulp.series("copy", gulp.parallel(browserifyTasks)));

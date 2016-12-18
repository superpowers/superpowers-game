"use strict";

const gulp = require("gulp");

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", function() {
  let failed = false;
  const tsResult = tsProject.src()
    .pipe(tslint({ tslint: require("tslint") }))
    .pipe(tslint.report("prose", { emitError: false }))
    .pipe(tsProject())
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("./src"));
});

// Browserify
const browserify = require("browserify");
const uglify = require('gulp-uglify');
const source = require("vinyl-source-stream");
const buffer = require('vinyl-buffer');
gulp.task("browserify", [ "typescript" ], () =>
  browserify("./src/index.js", { standalone: "SupEngine" })
    .bundle()
    .pipe(source("SupEngine.js"))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest("../public"))
);

// All
gulp.task("default", [ "typescript", "browserify" ]);

"use strict";

const gulp = require("gulp");

// Jade
const jade = require("gulp-jade");
gulp.task("jade", function() { return gulp.src("./src/index.jade").pipe(jade()).pipe(gulp.dest("../public")); });

// Stylus
const stylus = require("gulp-stylus");
gulp.task("stylus", function() { return gulp.src("./src/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public")); });

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("src/tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", function() {
  let failed = false;
  const tsResult = tsProject.src()
    .pipe(tslint({ tslint: require("tslint") }))
    .pipe(tslint.report("prose", { emitError: false }))
    .pipe(ts(tsProject))
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("src/"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], () =>
  browserify("./src/index.js", { standalone: "SupRuntime" })
    .bundle()
    .pipe(source("SupRuntime.js"))
    .pipe(gulp.dest("../public"))
);

// All
gulp.task("default", [ "jade", "stylus", "typescript", "browserify" ]);

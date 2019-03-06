"use strict";

const gulp = require("gulp");

// Pug
const pug = require("gulp-pug");
gulp.task("pug", function() { return gulp.src("./src/index.pug").pipe(pug()).pipe(gulp.dest("../public")); });

// Stylus
const stylus = require("gulp-stylus");
gulp.task("stylus", function() { return gulp.src("./src/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public")); });

// TypeScript
const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const tslint = require("gulp-tslint");

gulp.task("typescript", () => {
  let failed = false;
  const tsResult = tsProject.src()
    .pipe(tslint({ formatter: "prose" }))
    .pipe(tslint.report({ emitError: true }))
    .on("error", (err) => { throw err; })
    .pipe(tsProject())
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("src/"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");
gulp.task("browserify", () =>
  browserify("./src/index.js", { standalone: "SupRuntime" })
    .bundle()
    .pipe(source("SupRuntime.js"))
    .pipe(gulp.dest("../public"))
);

// All
gulp.task("default", gulp.parallel("pug", "stylus", gulp.series("typescript", "browserify")));

"use strict";

const gulp = require("gulp");

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
  return tsResult.js.pipe(gulp.dest("./src"));
});

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");
gulp.task("browserify", () =>
  browserify("./src/index.js", { standalone: "SupEngine" })
    .bundle()
    .pipe(source("SupEngine.js"))
    .pipe(gulp.dest("../public"))
);

// All
gulp.task("default", gulp.series("typescript", "browserify"));

"use strict";

const gulp = require("gulp");

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
gulp.task("browserify", [ "typescript" ], function() {
  const bundler = browserify("./src/index.js", { standalone: "SupEngine" });
  function bundle() { return bundler.bundle().pipe(source("SupEngine.js")).pipe(gulp.dest("../public")); };
  return bundle();
});

// All
gulp.task("default", [ "typescript", "browserify" ]);

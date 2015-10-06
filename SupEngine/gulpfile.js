var gulp = require("gulp");

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("src/tsconfig.json");

gulp.task("typescript", function() {
  var tsResult = tsProject.src().pipe(ts(tsProject));
  return tsResult.js.pipe(gulp.dest("src/"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./src/index.js", { standalone: "SupEngine" });
  function bundle() { return bundler.bundle().pipe(source("SupEngine.js")).pipe(gulp.dest("../../public/system")); };
  return bundle();
});

// All
gulp.task("default", [ "typescript", "browserify" ]);

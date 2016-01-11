var gulp = require("gulp");

// Jade
var jade = require("gulp-jade");
gulp.task("jade", function() { return gulp.src("./src/index.jade").pipe(jade()).pipe(gulp.dest("../public")); });

// Stylus
var stylus = require("gulp-stylus");
gulp.task("stylus", function() { return gulp.src("./src/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("../public")); });

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("src/tsconfig.json");

gulp.task("typescript", function() {
  var failed = false;
  var tsResult = tsProject.src()
    .pipe(ts(tsProject))
    .on("error", () => { failed = true; })
    .on("end", () => { if (failed) throw new Error("There were TypeScript errors."); });
  return tsResult.js.pipe(gulp.dest("src/"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ], function() {
  var bundler = browserify("./src/index.js", { standalone: "SupRuntime" });
  function bundle() { return bundler.bundle().pipe(source("SupRuntime.js")).pipe(gulp.dest("../public")); };
  return bundle();
});

// All
gulp.task("default", [ "jade", "stylus", "typescript", "browserify" ]);

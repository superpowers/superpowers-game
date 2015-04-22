var gulp = require("gulp");

// Copy
gulp.task("copy", function () { return gulp.src("./src/images/*").pipe(gulp.dest("../../public/player/images")); });

// Jade
var jade = require("gulp-jade");
gulp.task("jade", function() { return gulp.src("./src/index.jade").pipe(jade()).pipe(gulp.dest("../../public/player")); });

// Stylus
var stylus = require("gulp-stylus");
var nib = require("nib");
gulp.task("stylus", function() { return gulp.src("./src/index.styl").pipe(stylus({use: [ nib() ], errors: true})).pipe(gulp.dest("../../public/player")); });

// Typescript
var ts = require('gulp-typescript');
gulp.task("typescript", function() {
  var tsResult = gulp.src("**/*.ts").pipe(ts({
    typescript: require("typescript"),
    declarationFiles: false,
    module: "commonjs",
    target: "ES5"
  }));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
var browserify = require("browserify");
var source = require("vinyl-source-stream");
gulp.task("browserify", [ "typescript" ],function() {
  var bundler = browserify("./src/index.js");
  function bundle() { return bundler.bundle().pipe(source("index.js")).pipe(gulp.dest("../../public/player")); }
  return bundle();
});

// All
gulp.task("default", [ "copy", "jade", "stylus", "typescript", "browserify" ]);

var gulp = require("gulp");
var browserifyTasks = [];

// Browserify
var browserify = require("browserify");
var vinylSourceStream = require("vinyl-source-stream");
function makeBrowserify(source, destination, output) {
  gulp.task(output + "-browserify", function() {
    var bundler = browserify(source);
    bundler.transform("brfs");
    function bundle() { return bundler.bundle().pipe(vinylSourceStream(output + ".js")).pipe(gulp.dest(destination)); };
    return bundle();
  });
  browserifyTasks.push(output + "-browserify");
}

makeBrowserify("./componentConfigs/BaseComponentConfig.js", "./public", "BaseComponentConfig");

// All
gulp.task("default", gulp.parallel(browserifyTasks));

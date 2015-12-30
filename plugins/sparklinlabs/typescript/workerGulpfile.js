var gulp = require("gulp");
var tasks = [ "copy" ];

// Copy
gulp.task("copy", function () { return gulp.src("node_modules/highlight.js/styles/railscasts.css").pipe(gulp.dest("./public/editors/apiBrowser/")); });

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
  tasks.push(output + "-browserify");
}

makeBrowserify("./editors/script/typescriptWorker.js", "./public/editors", "script/typescriptWorker");

// All
gulp.task("default", tasks);

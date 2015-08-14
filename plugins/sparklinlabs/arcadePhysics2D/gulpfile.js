var gulp = require("gulp");
var tasks = [];

// TypeScript
var ts = require("gulp-typescript");
gulp.task("typescript", function() {
  var tsResult = gulp.src([ "**/*.ts", "!node_modules/**" ]).pipe(ts({
    typescript: require("typescript"),
    noImplicitAny: true,
    declarationFiles: false,
    module: "commonjs",
    target: "ES5"
  }));
  return tsResult.js.pipe(gulp.dest("./"));
});

// Browserify
var browserify = require("browserify");
var vinylSourceStream = require("vinyl-source-stream");
function makeBrowserify(source, destination, output) {
  gulp.task(output + "-browserify", [ "typescript" ], function() {
    var bundler = browserify(source);
    bundler.transform("brfs");
    function bundle() { return bundler.bundle().pipe(vinylSourceStream(output + ".js")).pipe(gulp.dest(destination)); };
    return bundle();
  });
  tasks.push(output + "-browserify");
}

makeBrowserify("./data/index.js", "./public", "data");
makeBrowserify("./components/index.js", "./public", "components");
makeBrowserify("./componentEditors/index.js", "./public", "componentEditors");
makeBrowserify("./runtime/index.js", "./public", "runtime");
makeBrowserify("./api/index.js", "./public", "api");
makeBrowserify("./settingsEditors/index.js", "./public", "settingsEditors");

// All
gulp.task("default", tasks);

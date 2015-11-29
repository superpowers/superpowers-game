var gulp = require("gulp");
var tasks = [];
var fs = require("fs");

// Jade
var jade = require("gulp-jade");
var rename = require("gulp-rename");
var locales = fs.readdirSync("./locales");
locales.forEach(function(locale) {
  var locals = {};
  var files = fs.readdirSync("./locales/" + locale);
  files.forEach(function(fileName) {
    var file = fs.readFileSync("./locales/" + locale + "/" + fileName, { encoding: "utf8" } );
    locals[fileName.slice(0, fileName.lastIndexOf("."))] = JSON.parse(file);
  });
  
  gulp.task("jade-" + locale, function() {
    return gulp.src("./editors/**/index.jade")
      .pipe(jade({ locals: locals }))
      .pipe(rename({ extname: "." + locale + ".html" }))
      .pipe(gulp.dest("./public/editors"));
  });
  tasks.push("jade-" + locale);
})


// Stylus
var stylus = require("gulp-stylus");
gulp.task("stylus", function() {
  return gulp.src("./editors/**/index.styl").pipe(stylus({ errors: true })).pipe(gulp.dest("./public/editors"));
});
tasks.push("stylus");

// TypeScript
var ts = require("gulp-typescript");
var tsProject = ts.createProject("./tsconfig.json");

gulp.task("typescript", function() {
  var tsResult = tsProject.src().pipe(ts(tsProject));
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
makeBrowserify("./documentation/index.js", "./public", "documentation");
var editors = fs.readdirSync("./editors");
editors.forEach(function(editor) {
  makeBrowserify("./editors/" + editor + "/index.js", "./public/editors", editor + "/index");
})

// All
gulp.task("default", tasks);

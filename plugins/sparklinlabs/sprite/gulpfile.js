var gulp = require("gulp");
var tasks = [];
var fs = require("fs");

// Jade
var jade = require("gulp-jade");
var rename = require("gulp-rename");
var localesPath = "./public/locales/";
var locales = fs.readdirSync(localesPath);

function loadLocales(locale) {
  var localsByContext = {};
  var files = fs.readdirSync(localesPath + locale);
  files.forEach(function(fileName) {
    var file = fs.readFileSync(localesPath + locale + "/" + fileName, { encoding: "utf8" });
    localsByContext[fileName.slice(0, fileName.lastIndexOf("."))] = JSON.parse(file);
  });
  localsByContext["common"] = JSON.parse(fs.readFileSync("../../../../../public/locales/" + locale + "/common.json", { encoding: "utf8" }));

  if (defaultLocals != null) {
    function checkRecursively(defaultRoot, root, key, path) {
      if (root[key] == undefined) {
        console.log("Missing key in " + locale + " translation: " + path);
        root[key] = defaultRoot[key];
      
      } else if (typeof defaultRoot[key] === "object") {
        var keys = Object.keys(defaultRoot[key]);
        for (var i = 0; i < keys.length; i++) {
          checkRecursively(defaultRoot[key], root[key], keys[i], path + "." + keys[i]);
        }
      }
    }
    var keys = Object.keys(defaultLocals);
    for (var i = 0; i < keys.length; i++)
      checkRecursively(defaultLocals, localsByContext, keys[i], keys[i]);
  }
  return localsByContext;
}

var defaultLocals = loadLocales("en");
locales.forEach(function(locale) {
  var localsByContext = loadLocales(locale);

  gulp.task("jade-" + locale, function() {
    var result = gulp.src("./editors/**/index.jade")
      .pipe(jade({ locals: { t: function(path) {
          var parts = path.split(":");
          var local = localsByContext[parts[0]];
          if (local == null) return path;

          var keys = parts[1].split(".");
          for (var i = 0; i < keys.length; i++) {
            local = local[keys[i]];
            if (local == null) return path;
          }
          return local;
        }}
       }))

    if (locale !== "en") result.pipe(rename({ extname: "." + locale + ".html" }));
    return result.pipe(gulp.dest("./public/editors"));
  });
  tasks.push("jade-" + locale);
})

gulp.task("jade-none", function() {
  return gulp.src("./editors/**/index.jade")
    .pipe(jade({ locals: { t: function(path) { return path; } } }))
    .pipe(rename({ extname: ".none.html" }))
    .pipe(gulp.dest("./public/editors"));
});
tasks.push("jade-none");

// Stylus
var stylus = require("gulp-stylus");
gulp.task("stylus", function() {
  return gulp.src("./editors/**/index.styl").pipe(stylus({ errors: true, compress: true })).pipe(gulp.dest("./public/editors"));
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
var editors = require("fs").readdirSync("./editors");
editors.forEach(function(editor) {
  makeBrowserify("./editors/" + editor + "/index.js", "./public/editors", editor + "/index");
});

// All
gulp.task("default", tasks);

gulp = require 'gulp'
tasks = []

# Browserify
browserify = require 'browserify'
vinylSourceStream = require 'vinyl-source-stream'
makeBrowserify = (source, destination, output) ->
  gulp.task "#{output}-browserify", ->
    bundler = browserify source, extensions: ['.coffee']
    bundler.transform 'coffeeify'
    bundler.transform 'brfs'
    bundle = -> bundler.bundle().pipe(vinylSourceStream("#{output}.js")).pipe gulp.dest(destination)
    bundle()

  tasks.push "#{output}-browserify"

makeBrowserify "./data/index.coffee", "./public", "data"
makeBrowserify "./components/index.coffee", "./public", "components"
makeBrowserify "./componentEditors/index.coffee", "./public", "componentEditors"
makeBrowserify "./runtime/index.coffee", "./public", "runtime"
makeBrowserify "./api/index.coffee", "./public", "api"

# All
gulp.task 'default', tasks

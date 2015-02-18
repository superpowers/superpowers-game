gulp = require 'gulp'
tasks = [ 'jade', 'stylus' ]

# Jade
jade = require 'gulp-jade'
gulp.task 'jade', -> gulp.src('./editors/**/index.jade').pipe(jade()).pipe(gulp.dest('./public/editors'))

# Stylus
stylus = require 'gulp-stylus'
nib = require 'nib'
cssimport = require 'gulp-cssimport'
gulp.task 'stylus', -> gulp.src('./editors/**/index.styl').pipe(stylus(use: [ nib() ], errors: true)).pipe(cssimport()).pipe(gulp.dest('./public/editors'))

# Browserify
browserify = require 'browserify'
vinylSourceStream = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
makeBrowserify = (source, destination, output) ->
  gulp.task "#{output}-browserify", ->
    bundler = browserify source, extensions: ['.coffee']
    bundler.transform coffeeify
    bundle = -> bundler.bundle().pipe(vinylSourceStream("#{output}.js")).pipe gulp.dest(destination)
    bundle()

  tasks.push "#{output}-browserify"

makeBrowserify "./api/index.coffee", "./public", "api"
makeBrowserify "./components/index.coffee", "./public", "components"
makeBrowserify "./componentEditors/index.coffee", "./public", "componentEditors"
makeBrowserify "./runtime/index.coffee", "./public", "runtime"
makeBrowserify "./editors/#{editor}/index.coffee", "./public/editors", "#{editor}/index" for editor in require('fs').readdirSync './editors'

# All
gulp.task 'default', tasks

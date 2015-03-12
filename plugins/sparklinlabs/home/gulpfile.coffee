gulp = require 'gulp'
tasks = [ 'jade', 'stylus' ]

# Jade
jade = require 'gulp-jade'
gulp.task 'jade', -> gulp.src('./editors/**/index.jade').pipe(jade()).pipe(gulp.dest('./public/editors'))

# Stylus
stylus = require 'gulp-stylus'
nib = require 'nib'
gulp.task 'stylus', -> gulp.src('./editors/**/index.styl').pipe(stylus(use: [ nib() ], errors: true)).pipe(gulp.dest('./public/editors'))

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

makeBrowserify "./editors/#{editor}/index.coffee", "./public/editors", "#{editor}/index" for editor in require('fs').readdirSync './editors'

# All
gulp.task 'default', tasks

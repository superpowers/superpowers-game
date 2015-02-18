gulp = require 'gulp'

# Copy
gulp.task 'copy', -> gulp.src('./src/images/*').pipe(gulp.dest('../../public/player/images'))

# Jade
jade = require 'gulp-jade'
gulp.task 'jade', -> gulp.src('./src/index.jade').pipe(jade()).pipe(gulp.dest('../../public/player'))

# Stylus
stylus = require 'gulp-stylus'
nib = require 'nib'
gulp.task 'stylus', -> gulp.src('./src/index.styl').pipe(stylus(use: [ nib() ], errors: true)).pipe(gulp.dest('../../public/player'))

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './src/index.coffee', extensions: ['.coffee']
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('index.js')).pipe gulp.dest('../../public/player')
  bundle()

# All
gulp.task 'default', [ 'copy', 'jade', 'stylus', 'browserify' ]

gulp = require 'gulp'

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './SupRuntime.coffee', extensions: ['.coffee'], standalone: 'SupRuntime'
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('SupRuntime.js')).pipe gulp.dest('../../public/system')
  bundle()

# All
gulp.task 'default', [ 'browserify' ]

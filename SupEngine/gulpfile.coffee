gulp = require 'gulp'

# Browserify
browserify = require 'browserify'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
gulp.task 'browserify', ->
  bundler = browserify './SupEngine.coffee', extensions: ['.coffee'], standalone: 'SupEngine'
  bundler.transform coffeeify
  bundle = -> bundler.bundle().pipe(source('SupEngine.js')).pipe gulp.dest('../../public/system')
  bundle()

# All
gulp.task 'default', [ 'browserify' ]

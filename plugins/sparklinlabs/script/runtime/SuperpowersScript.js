!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.SuperpowersScript=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var SuperpowersScript, async, parse;

async = _dereq_('async');

parse = _dereq_('./parse');

module.exports = SuperpowersScript = {
  tokenize: _dereq_('./tokenize'),
  symbolizer: _dereq_('./symbolizer'),
  generateCode: _dereq_('./genCode'),
  link: _dereq_('./link'),
  printError: _dereq_('./printError'),
  compile: function(scriptCode, callback) {
    var data;
    data = null;
    async.waterfall([
      function(cb) {
        SuperpowersScript.appendScript(scriptCode, null, cb);
      }, function(scriptData, cb) {
        data = scriptData;
        SuperpowersScript.symbolizer.buildSymbolsTable('local', data.ast, data.symbols, cb);
      }, function(localSymbols, symbolErrors, cb) {
        data.symbols = localSymbols;
        data.symbolErrors = data.symbolErrors.concat(symbolErrors);
        SuperpowersScript.generateCode(data.ast, data.symbols, cb);
      }, function(declarations, main, cb) {
        data.declarations = declarations;
        data.main = main;
        data.linkedCode = SuperpowersScript.link([declarations], [main]);
        cb(null, data);
      }
    ], callback);
  },
  appendScript: function(scriptCode, globalSymbols, callback) {
    var data;
    data = {};
    async.waterfall([
      function(cb) {
        SuperpowersScript.tokenize(scriptCode, cb);
      }, function(tokens, cb) {
        data.tokens = tokens;
        parse(data.tokens.slice(), cb);
      }, function(ast, parseErrors, cb) {
        data.ast = ast;
        data.parseErrors = parseErrors;
        SuperpowersScript.symbolizer.buildSymbolsTable('global', ast, globalSymbols, cb);
      }, function(globalSymbols, symbolErrors, cb) {
        data.symbols = globalSymbols;
        data.symbolErrors = symbolErrors;
        cb();
      }
    ], function(err) {
      if (err != null) {
        callback(err);
        return;
      }
      callback(null, data);
    });
  }
};



},{"./genCode":5,"./link":6,"./parse":7,"./printError":8,"./symbolizer":9,"./tokenize":10,"async":2}],2:[function(_dereq_,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,_dereq_('_process'))
},{"_process":3}],3:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(_dereq_,module,exports){
exports.builtinSymbols = {
  blackbox: {
    path: 'blackbox',
    node: {
      type: 'blueprint'
    }
  },
  box: {
    path: 'box',
    node: {
      type: 'blueprint'
    }
  },
  number: {
    path: 'number',
    node: {
      type: 'blueprint'
    }
  },
  string: {
    path: 'string',
    node: {
      type: 'blueprint'
    }
  },
  boolean: {
    path: 'boolean',
    node: {
      type: 'blueprint'
    }
  },
  List: {
    path: 'List',
    node: {
      type: 'blueprint'
    }
  },
  'List.insert': {
    path: 'List.insert',
    node: {
      type: 'action',
      parameters: [
        {
          type: 'parameter',
          varTypeSymbolPath: 'number'
        }, {
          type: 'parameter',
          varTypeSymbolPath: 'blackbox'
        }
      ]
    }
  },
  'List.remove': {
    path: 'List.remove',
    node: {
      type: 'action',
      parameters: [
        {
          type: 'parameter',
          varTypeSymbolPath: 'number'
        }
      ]
    }
  },
  'List.push': {
    path: 'List.push',
    node: {
      type: 'action',
      parameters: [
        {
          type: 'parameter',
          varTypeSymbolPath: 'blackbox'
        }
      ]
    }
  },
  'List.splice': {
    path: 'List.splice',
    node: {
      type: 'action',
      parameters: []
    }
  },
  'List.slice': {
    path: 'List.slice',
    node: {
      type: 'action',
      parameters: []
    }
  },
  'List.indexOf': {
    path: 'List.indexOf',
    node: {
      type: 'action',
      parameters: [
        {
          type: 'parameter',
          varTypeSymbolPath: 'blackbox'
        }
      ],
      returnTypeIdNode: {
        type: 'id',
        name: 'number'
      }
    },
    state: {
      blueprint: 'List'
    }
  },
  'List.length': {
    path: 'List.length',
    node: {
      type: 'property',
      varTypeSymbolPath: 'number'
    }
  },
  Dictionary: {
    path: 'Dictionary',
    node: {
      type: 'blueprint'
    }
  }
};

exports.prelude = "'use strict';\nvar __extends = function(child, parent) { for (var key in parent) { if(parent.hasOwnProperty(key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); };\nvar __merge = function(dst, src) { Object.keys(src).forEach(function(key) { if (typeof src[key] === 'object') { if (dst[key] == null) { dst[key] = {}; } __merge(dst[key], src[key]); } else { dst[key] = src[key]; } }) };\n\nArray.prototype.insert = function(index, value) {\n  return Array.prototype.splice.call(this, index, 0, value);\n}\n\nArray.prototype.remove = function(index) {\n  return Array.prototype.splice.call(this, index, 1);\n}\n";

exports.interlude = '__merge(root, globals);\n';

exports.postlude = "//@ sourceURL=script.js";



},{}],5:[function(_dereq_,module,exports){
var symbolizer;

symbolizer = _dereq_('./symbolizer');

module.exports = function(ast, symbols, callback) {
  var declarations, generateBlueprint, generateBlueprintAction, generateBlueprintConstruct, generateBlueprintProperties, generateBlueprintPropertiesChild, generateBlueprintStatement, generateCall, generateDelete, generateDictionaryIteration, generateDictionaryLiteral, generateDoc, generateExpression, generateId, generateIf, generateIndex, generateListIteration, generateListLiteral, generateMachine, generateNamespace, generateNew, generateParameters, generateStatement, generateStringLiteral, generateWhile, generatedNamespaces, main, node, state, _i, _len, _ref;
  state = {
    namespace: null,
    blueprint: null,
    machine: null,
    scope: null,
    scopeIndex: 0
  };
  generateStatement = function(node) {
    var initialization;
    switch (node.type) {
      case 'local':
        initialization = node.valueNode != null ? " = " + (generateExpression(node.valueNode)) : '';
        if ((state.namespace != null) && (state.machine == null)) {
          return "/* root." + node.varTypeSymbolPath + " */ root." + state.namespace.name + "." + node.idNode.name + initialization + ";\n";
        } else {
          return "var /* root." + node.varTypeSymbolPath + " */ " + node.idNode.name + initialization + ";\n";
        }
        break;
      case '<-':
        return "" + (generateExpression(node.targetNode)) + " = " + (generateExpression(node.valueNode)) + ";\n";
      case '+=':
      case '-=':
      case '*=':
      case '/=':
      case '%=':
        return "" + (generateExpression(node.targetNode)) + " " + node.type + " " + (generateExpression(node.valueNode)) + ";\n";
      case 'call':
        return "" + (generateCall(node)) + ";\n";
      case 'if':
        return generateIf(node);
      case 'while':
        return generateWhile(node);
      case 'iterateList':
        return generateListIteration(node);
      case 'iterateDictionary':
        return generateDictionaryIteration(node);
      case 'return':
        if (node.valueNode != null) {
          return "return " + (generateExpression(node.valueNode)) + ";\n";
        } else {
          return 'return;\n';
        }
        break;
      case 'break':
        return 'break;\n';
      case 'continue':
        return 'continue;\n';
      case 'new':
        return "" + (generateNew(node)) + ";\n";
      case 'delete':
        return "" + (generateDelete(node)) + ";\n";
      case 'namespace':
        return generateNamespace(node);
      case 'blueprint':
        return generateBlueprint(node);
      case 'machine':
        return generateMachine(node);
      case '#':
        return generateDoc(node);
      default:
        return "/* Unhandled statement node type: " + node.type + " */\n";
    }
  };
  generateExpression = function(node) {
    var operator;
    switch (node.type) {
      case 'nothing':
        return 'null';
      case 'new':
        return generateNew(node);
      case 'call':
        return generateCall(node);
      case '()':
        return "(" + (generateExpression(node.innerExpressionNode)) + ")";
      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
      case '+':
      case '-':
      case '/':
      case '*':
      case '%':
      case 'and':
      case 'or':
        operator = (function() {
          switch (node.type) {
            case '=':
              return '===';
            case 'and':
              return '&&';
            case 'or':
              return '||';
            default:
              return node.type;
          }
        })();
        return "" + (generateExpression(node.lhsNode)) + " " + operator + " " + (generateExpression(node.rhsNode));
      case 'not':
        return "!" + (generateExpression(node.innerExpressionNode));
      case 'negate':
        return "-" + (generateExpression(node.innerExpressionNode));
      case 'id':
      case 'self':
        return generateId(node);
      case 'index':
        return generateIndex(node);
      case 'numberLiteral':
        return "" + node.value;
      case 'stringLiteral':
        return generateStringLiteral(node);
      case 'booleanLiteral':
        return "" + node.value;
      case 'listLiteral':
        return generateListLiteral(node);
      case 'dictionaryLiteral':
        return generateDictionaryLiteral(node);
      default:
        return "/* Unhandled node type: " + node.type + " */";
    }
  };
  generateNew = function(node) {
    return "new " + (generateCall(node.callNode));
  };
  generateDelete = function(node) {
    return "delete " + (generateIndex(node.indexNode));
  };
  generateCall = function(node) {
    var argNode, args, symbol;
    args = (function() {
      var _i, _len, _ref, _results;
      _ref = node["arguments"];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        argNode = _ref[_i];
        _results.push(generateExpression(argNode));
      }
      return _results;
    })();
    symbol = symbolizer.getSymbolForNode(node.targetNode, state, symbols);
    return "" + (generateExpression(node.targetNode)) + "(" + (args.join(', ')) + ")";
  };
  generateDoc = function(node) {
    return "/* " + node.value + " */\n";
  };
  generateId = function(node) {
    var fullName, symbol;
    if (node.type === 'self') {
      return 'this';
    }
    fullName = node.name;
    if (node.parentNode != null) {
      fullName = "" + (generateExpression(node.parentNode)) + "." + fullName;
    }
    symbol = symbolizer.getSymbolForNode(node, state, symbols);
    if (symbol != null) {
      switch (symbol.node.type) {
        case 'namespace':
        case 'blueprint':
          return "root." + symbol.path;
        case 'local':
        case 'parameter':
        case 'property':
        case 'action':
          return fullName;
        case 'machine':
          if (symbol.node.transcendentalNode != null) {
            return "root." + symbol.path;
          }
          return fullName;
      }
    } else {
      console.warn("No symbol found for " + fullName);
      return fullName;
    }
  };
  generateIndex = function(node) {
    return "" + (generateExpression(node.parentNode)) + "[" + (generateExpression(node.indexNode)) + "]";
  };
  generateStringLiteral = function(node) {
    var escapedValue;
    escapedValue = node.value.replace(/'/g, "\\'");
    return "'" + escapedValue + "'";
  };
  generateListLiteral = function(node) {
    var content, item;
    content = (function() {
      var _i, _len, _ref, _results;
      _ref = node.items;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        _results.push(generateExpression(item));
      }
      return _results;
    })();
    return "[ " + (content.join(', ')) + " ]";
  };
  generateDictionaryLiteral = function(node) {
    var content, entry;
    content = (function() {
      var _i, _len, _ref, _results;
      _ref = node.entries;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entry = _ref[_i];
        _results.push("" + (generateStringLiteral(entry.keyNode)) + ": " + (generateExpression(entry.valueNode)));
      }
      return _results;
    })();
    return "{ " + (content.join(', ')) + " }";
  };
  generateIf = function(node) {
    var contentCode, elseContentCode, ifCode, oldScope, subNode, test, _i, _j, _len, _len1, _ref, _ref1;
    test = generateExpression(node.testNode);
    oldScope = state.scope;
    state.scope = {
      name: "" + node.type + "_" + (state.scopeIndex++),
      index: state.scopeIndex
    };
    contentCode = '';
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      contentCode += generateStatement(subNode);
    }
    state.scope = oldScope;
    ifCode = "if(" + test + ") {\n" + contentCode + "}";
    if (node.elseIfNode != null) {
      return "" + ifCode + " else " + (generateStatement(node.elseIfNode));
    } else if (node.elseContent != null) {
      state.scope = {
        name: "" + node.type + "_" + (state.scopeIndex++),
        index: state.scopeIndex
      };
      elseContentCode = '';
      _ref1 = node.elseContent;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        subNode = _ref1[_j];
        elseContentCode += generateStatement(subNode);
      }
      state.scope = oldScope;
      return "" + ifCode + " else {\n" + elseContentCode + "}\n";
    }
    return "" + ifCode + "\n";
  };
  generateWhile = function(node) {
    var contentCode, oldScope, subNode, test, _i, _len, _ref;
    test = generateExpression(node.testNode);
    oldScope = state.scope;
    state.scope = {
      name: "" + node.type + "_" + (state.scopeIndex++),
      index: state.scopeIndex
    };
    contentCode = '';
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      contentCode += generateStatement(subNode);
    }
    state.scope = oldScope;
    return "while(" + test + ") {\n" + contentCode + "}\n";
  };
  generateListIteration = function(node) {
    var contentCode, indexVar, indexVarColon, indexVarEquals, iterator, oldScope, subNode, valueVar, _i, _len, _ref;
    iterator = generateExpression(node.iteratorNode);
    oldScope = state.scope;
    state.scope = {
      name: "" + node.type + "_" + (state.scopeIndex++),
      index: state.scopeIndex
    };
    valueVar = generateId(node.valueNode.idNode);
    if (node.indexNode != null) {
      indexVar = generateId(node.indexNode.idNode);
    }
    contentCode = '';
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      contentCode += generateStatement(subNode);
    }
    state.scope = oldScope;
    indexVarEquals = indexVar != null ? "" + indexVar + " = " : '';
    indexVarColon = indexVar != null ? "" + indexVar + ", " : '';
    return "var " + valueVar + ", " + indexVarColon + "_i, _len, _ref = " + iterator + ";\nfor(" + indexVarEquals + "_i = 0, _len = _ref.length; _i < _len; " + indexVarEquals + "++_i) {\n" + valueVar + " = _ref[_i];\n" + contentCode + "}\n";
  };
  generateDictionaryIteration = function(node) {
    var contentCode, iterator, keyVar, oldScope, setValueVar, subNode, valueVar, _i, _len, _ref;
    iterator = generateExpression(node.iteratorNode);
    oldScope = state.scope;
    state.scope = {
      name: "" + node.type + "_" + (state.scopeIndex++),
      index: state.scopeIndex
    };
    keyVar = generateId(node.keyNode.idNode);
    if (node.valueNode != null) {
      valueVar = generateId(node.valueNode.idNode);
    }
    contentCode = '';
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      contentCode += generateStatement(subNode);
    }
    state.scope = oldScope;
    setValueVar = valueVar != null ? "var " + valueVar + " = _ref[" + keyVar + "];\n" : '';
    return "var _ref = " + iterator + ";\nfor(var " + keyVar + " in _ref) {\n" + setValueVar + contentCode + "}\n";
  };
  generatedNamespaces = {};
  generateNamespace = function(node) {
    var contentCode, name, subNode, _i, _len, _ref;
    state.namespace = {
      name: node.idNode.name
    };
    name = "root." + node.idNode.name;
    contentCode = "/* Namespace " + state.namespace.name + " */\n";
    if (generatedNamespaces[name] == null) {
      contentCode += "" + name + " = {};\n";
      generatedNamespaces[name] = true;
    }
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      contentCode += generateStatement(subNode);
    }
    contentCode += "/* End namespace " + state.namespace.name + " */\n";
    state.namespace = null;
    return contentCode;
  };
  generateBlueprint = function(node) {
    var constructCode, contentCode, initCode, name, otherCode, subNode, _i, _len, _ref;
    state.blueprint = {
      name: node.idNode.name
    };
    name = "root.";
    if (state.namespace != null) {
      name += "" + state.namespace.name + ".";
    }
    name += node.idNode.name;
    contentCode = "/* Blueprint " + state.blueprint.name + " */\n";
    constructCode = null;
    initCode = node.parentBlueprintIdNode != null ? '_super.apply(this, arguments);\n' : '';
    otherCode = '';
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      switch (subNode.type) {
        case 'properties':
          initCode += generateBlueprintProperties(subNode);
          break;
        case 'construct':
          constructCode = generateBlueprintConstruct(subNode);
          break;
        default:
          otherCode += generateBlueprintStatement(subNode);
      }
    }
    if (node.parentBlueprintIdNode != null) {
      contentCode += "" + name + " = (function(_super) {\n__extends(" + state.blueprint.name + ", _super);\n";
    } else {
      contentCode += "" + name + " = (function() {\n";
    }
    if (constructCode == null) {
      constructCode = "function " + state.blueprint.name + "() {\n" + initCode + "}\n";
    } else {
      constructCode = constructCode.start + initCode + constructCode.end;
    }
    contentCode += constructCode;
    contentCode += otherCode;
    contentCode += "return " + node.idNode.name + ";\n";
    if (node.parentBlueprintIdNode != null) {
      contentCode += "})(" + (generateId(node.parentBlueprintIdNode)) + ");\n";
    } else {
      contentCode += "})();\n";
    }
    contentCode += "/* End blueprint " + state.blueprint.name + " */\n";
    state.blueprint = null;
    return contentCode;
  };
  generateBlueprintStatement = function(node) {
    switch (node.type) {
      case '#':
        return generateDoc(node);
      case 'action':
        return generateBlueprintAction(node);
      case 'machine':
        return generateMachine(node);
    }
  };
  generateBlueprintProperties = function(node) {
    var propertiesCode, subNode, _i, _len, _ref;
    propertiesCode = '';
    _ref = node.content;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subNode = _ref[_i];
      propertiesCode += generateBlueprintPropertiesChild(subNode);
    }
    return propertiesCode;
  };
  generateBlueprintPropertiesChild = function(node) {
    var initialization;
    switch (node.type) {
      case '#':
        return generateDoc(node);
      case 'property':
        initialization = node.valueNode != null ? " = " + (generateExpression(node.valueNode)) : '';
        return "/* root." + node.varTypeSymbolPath + " */ this." + node.idNode.name + initialization + ";\n";
    }
  };
  generateBlueprintConstruct = function(node) {
    var args, contentCode, name, paramNode, subNode, _i, _len, _ref;
    state.machine = {
      name: 'construct'
    };
    if (node.transcendentalNode == null) {
      contentCode = '';
      _ref = node.content;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subNode = _ref[_i];
        contentCode += generateStatement(subNode);
      }
      state.machine = null;
      return {
        start: "function " + state.blueprint.name + "(" + (generateParameters(node)) + ") {\n",
        end: "" + contentCode + "}\n"
      };
    } else {
      name = "root.";
      if (state.namespace != null) {
        name += "" + state.namespace.name + ".";
      }
      if (state.blueprint != null) {
        name += "" + state.blueprint.name + ".";
      }
      args = (function() {
        var _j, _len1, _ref1, _results;
        _ref1 = node.parameters;
        _results = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          paramNode = _ref1[_j];
          _results.push(paramNode.idNode.name);
        }
        return _results;
      })();
      args.unshift('this');
      state.machine = null;
      return {
        start: "function " + state.blueprint.name + "(" + (generateParameters(node)) + ") {\n",
        end: "/* transcendental */\n" + name + "construct.call(" + (args.join(', ')) + ");\n}\n"
      };
    }
  };
  generateBlueprintAction = function(node) {
    var contentCode, subNode, _i, _len, _ref;
    state.machine = {
      name: node.idNode.name
    };
    if (node.transcendentalNode != null) {
      state.machine = null;
      return "// action " + node.idNode.name + "(" + (generateParameters(node)) + ") { /* transcendental */ }\n";
    } else if (node.abstractNode != null) {
      state.machine = null;
      return "// action " + node.idNode.name + "(" + (generateParameters(node)) + ") { /* abstract */ }\n";
    } else {
      contentCode = '';
      _ref = node.content;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subNode = _ref[_i];
        contentCode += generateStatement(subNode);
      }
      state.machine = null;
      return "" + state.blueprint.name + ".prototype." + node.idNode.name + " = function(" + (generateParameters(node)) + ") {\n" + contentCode + "}\n";
    }
  };
  generateMachine = function(node) {
    var contentCode, name, oldMachine, subNode, _i, _len, _ref;
    oldMachine = state.machine;
    state.machine = {
      name: node.idNode.name
    };
    name = state.blueprint != null ? "" + state.blueprint.name + "." : (state.namespace != null) && (oldMachine == null) ? "root." + state.namespace.name + "." : node.transcendentalNode != null ? "root." : "var ";
    name += node.idNode.name;
    if (node.transcendentalNode == null) {
      contentCode = '';
      _ref = node.content;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subNode = _ref[_i];
        contentCode += generateStatement(subNode);
      }
      state.machine = oldMachine;
      return "" + name + " = function(" + (generateParameters(node)) + ") {\n" + contentCode + "}\n";
    } else {
      state.machine = oldMachine;
      return "// machine " + name + "(" + (generateParameters(node)) + ") { /* transcendental */ }\n";
    }
  };
  generateParameters = function(node) {
    var paramNode, params, _i, _len, _ref;
    params = [];
    _ref = node.parameters;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      paramNode = _ref[_i];
      params.push("/* root." + paramNode.varTypeSymbolPath + " */ " + paramNode.idNode.name);
    }
    return params.join(', ');
  };
  declarations = '';
  main = '';
  for (_i = 0, _len = ast.length; _i < _len; _i++) {
    node = ast[_i];
    if ((_ref = node.type) === 'namespace' || _ref === 'blueprint' || _ref === 'machine') {
      declarations += generateStatement(node);
    } else {
      main += generateStatement(node);
    }
  }
  return callback(null, declarations, main);
};



},{"./symbolizer":9}],6:[function(_dereq_,module,exports){
var boilerplate;

boilerplate = _dereq_('./boilerplate');

module.exports = function(declarationsList, mainList) {
  var main;
  mainList = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = mainList.length; _i < _len; _i++) {
      main = mainList[_i];
      _results.push("(function(){\n" + main + "}());\n");
    }
    return _results;
  })();
  return boilerplate.prelude + declarationsList.join('\n') + boilerplate.interlude + mainList.join('\n') + boilerplate.postlude;
};



},{"./boilerplate":4}],7:[function(_dereq_,module,exports){
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

module.exports = function(tokenStack, callback) {
  var activeDepth, activeToken, ast, errors, getNextTokenType, grabNextToken, grabToken, makeErrorNode, makeExpectedErrorNode, parseAssignment, parseBlueprint, parseBlueprintFunction, parseBlueprintProperties, parseBlueprintStatement, parseBreak, parseCall, parseChildBlock, parseCompositeExpression, parseContinue, parseDeclaration, parseDelete, parseDictionary, parseDoc, parseExpression, parseFor, parseGlobalDeclaration, parseId, parseIf, parseIndex, parseList, parseMachine, parseNamespace, parseNamespaceStatement, parseNew, parseParametersList, parseParentedId, parsePropertyDeclaration, parseReturn, parseReturnTypeId, parseStatement, parseWhile, result, skipTokensTill;
  errors = [];
  ast = [];
  activeDepth = 0;
  activeToken = tokenStack[0];
  makeErrorNode = function(errorType, data) {
    var errorNode;
    errorNode = {
      type: 'error',
      errorType: errorType,
      data: data,
      line: activeToken.line,
      column: activeToken.column
    };
    errors.push(errorNode);
    return errorNode;
  };
  makeExpectedErrorNode = function(expectedList) {
    if (!Array.isArray(expectedList)) {
      throw new Error('expectedList must be a list');
    }
    return makeErrorNode('expected', {
      expected: expectedList,
      found: getNextTokenType()
    });
  };
  parseGlobalDeclaration = function() {
    switch (getNextTokenType()) {
      case null:
        return null;
      case 'endStatement':
        grabNextToken();
        return null;
      case 'blockStart':
        grabNextToken();
        activeDepth++;
        return null;
      case 'blockEnd':
        grabNextToken();
        activeDepth--;
        return null;
      case '#':
        return parseDoc();
      case 'namespace':
        return parseNamespace();
      case 'blueprint':
        return parseBlueprint();
      case 'abstract':
        return parseBlueprint({
          abstractNode: grabNextToken()
        });
      case 'transcendental':
        return parseMachine({
          transcendentalNode: grabNextToken()
        });
      default:
        return 'endGlobalDeclarations';
    }
  };
  parseStatement = function() {
    var expectedError, result, targetNode, _ref;
    switch (getNextTokenType()) {
      case null:
        return null;
      case 'endStatement':
        grabNextToken();
        return null;
      case 'blockStart':
        grabNextToken();
        activeDepth++;
        return null;
      case 'blockEnd':
        grabNextToken();
        activeDepth--;
        return null;
      case '#':
        return parseDoc();
      case 'if':
        return parseIf();
      case 'machine':
        return parseMachine();
      case 'return':
        return parseReturn();
      case 'while':
        return parseWhile();
      case 'for':
        return parseFor();
      case 'break':
        return parseBreak();
      case 'continue':
        return parseContinue();
      case 'new':
        return parseNew();
      case 'delete':
        return parseDelete();
      case 'id':
      case 'self':
        targetNode = parseExpression();
        if (targetNode.type === 'call') {
          return targetNode;
        }
        if ((_ref = targetNode.type) !== 'id' && _ref !== 'index') {
          return makeExpectedErrorNode(['declaration', 'assignment', 'call']);
        }
        result = (function() {
          switch (getNextTokenType()) {
            case 'id':
              return parseDeclaration(targetNode, 'local');
            case '<-':
            case '+=':
            case '-=':
            case '*=':
            case '/=':
            case '%=':
              return parseAssignment(targetNode);
            default:
              return makeExpectedErrorNode(['declaration', 'assignment', 'call']);
          }
        })();
        return result;
      default:
        expectedError = makeExpectedErrorNode(['statement']);
        grabNextToken();
        return expectedError;
    }
  };
  grabNextToken = function(nope) {
    if (nope != null) {
      throw new Error("grabNextToken doesn't take any arguments. Did you mean to call grabToken?");
    }
    if (tokenStack.length < 1) {
      return null;
    }
    activeToken = tokenStack.splice(0, 1)[0];
    return activeToken;
  };
  getNextTokenType = function() {
    if (tokenStack.length < 1) {
      return null;
    }
    return tokenStack[0].type;
  };
  grabToken = function(type) {
    var t, token, _i, _len;
    if (Array.isArray(type)) {
      for (_i = 0, _len = type.length; _i < _len; _i++) {
        t = type[_i];
        token = grabToken(t);
        if (token != null) {
          return token;
        }
      }
      return null;
    }
    if (tokenStack.length < 1 || tokenStack[0].type !== type) {
      return null;
    }
    activeToken = tokenStack.splice(0, 1)[0];
    return activeToken;
  };
  skipTokensTill = function(types) {
    var nextTokenType;
    while (true) {
      nextTokenType = getNextTokenType();
      if ((nextTokenType == null) || __indexOf.call(types, nextTokenType) >= 0) {
        break;
      }
      grabNextToken();
    }
  };
  parseDeclaration = function(typeIdNode, declType) {
    var idNode, valueNode;
    idNode = parseId();
    if (grabToken('<-') != null) {
      valueNode = parseExpression();
    }
    return {
      type: declType,
      typeIdNode: typeIdNode,
      idNode: idNode,
      valueNode: valueNode,
      column: typeIdNode.column,
      line: typeIdNode.line
    };
  };
  parseAssignment = function(targetNode) {
    var assignmentToken, tokenTypes;
    tokenTypes = ['<-', '+=', '-=', '*=', '/=', '%='];
    assignmentToken = grabToken(tokenTypes);
    if (assignmentToken == null) {
      return makeExpectedErrorNode(tokenTypes);
    }
    return {
      type: assignmentToken.type,
      targetNode: targetNode,
      valueNode: parseExpression(),
      column: assignmentToken.column,
      line: assignmentToken.line
    };
  };
  parseCall = function(targetNode) {
    var argumentsList, callNode;
    callNode = grabToken('(');
    if (callNode == null) {
      return makeExpectedErrorNode(['(']);
    }
    argumentsList = [];
    if (getNextTokenType() == null) {
      argumentsList.push(makeExpectedErrorNode(['expression', ')']));
    } else if (grabToken(')') == null) {
      while (true) {
        argumentsList.push(parseExpression());
        if (grabToken(')') != null) {
          break;
        }
        if (grabToken(',') == null) {
          argumentsList.push(makeExpectedErrorNode([',', ')']));
          skipTokensTill([',', ')', 'blockStart', 'endStatement', 'blockEnd']);
          if (grabToken(')') != null) {
            break;
          }
          if (grabToken(',') == null) {
            break;
          }
        }
      }
    }
    return {
      type: 'call',
      targetNode: targetNode,
      "arguments": argumentsList,
      line: callNode.line,
      column: callNode.column
    };
  };
  parseIndex = function(parentNode) {
    var indexNode, indexStartToken;
    indexStartToken = grabToken('[');
    if (indexStartToken == null) {
      return makeExpectedErrorNode(['[']);
    }
    indexNode = parseExpression();
    if (grabToken(']') == null) {
      return makeExpectedErrorNode([']']);
    }
    return {
      type: 'index',
      indexNode: indexNode,
      parentNode: parentNode,
      line: indexStartToken.line,
      column: indexStartToken.column
    };
  };
  parseId = function(parentExpr) {
    var idToken;
    idToken = grabToken('id');
    if (idToken == null) {
      return makeExpectedErrorNode(['id']);
    }
    return {
      type: 'id',
      name: idToken.value,
      parentNode: parentExpr,
      line: idToken.line,
      column: idToken.column
    };
  };
  parseParentedId = function(parentExpr) {
    var idNode;
    idNode = parseId();
    while (grabToken('.') != null) {
      idNode = parseId(idNode);
    }
    return idNode;
  };
  parseExpression = function(precedence) {
    var expr, tokenType, _ref;
    if (precedence == null) {
      precedence = 20;
    }
    expr = null;
    tokenType = getNextTokenType();
    switch (tokenType) {
      case 'self':
      case 'numberLiteral':
      case 'stringLiteral':
      case 'booleanLiteral':
      case 'nothing':
        expr = grabNextToken();
        break;
      case 'new':
        expr = parseNew();
        break;
      case 'id':
        expr = parseId();
        break;
      case '(':
        grabNextToken();
        expr = {
          type: '()',
          innerExpressionNode: parseExpression()
        };
        if (grabToken(')') == null) {
          return makeExpectedErrorNode([')']);
        }
        break;
      case '[':
        expr = parseList();
        break;
      case '{':
        expr = parseDictionary();
        break;
      case 'not':
        grabNextToken();
        expr = {
          type: 'not',
          innerExpressionNode: parseExpression()
        };
        break;
      case '-':
        grabNextToken();
        if (getNextTokenType() === '-') {
          return makeErrorNode('unexpected', {
            found: 'negate'
          });
        }
        expr = {
          type: 'negate',
          innerExpressionNode: parseExpression()
        };
        break;
      default:
        return makeExpectedErrorNode(['expression']);
    }
    return (_ref = parseCompositeExpression(expr, precedence)) != null ? _ref : expr;
  };
  parseNew = function() {
    var callNode, newToken;
    newToken = grabToken('new');
    if (newToken == null) {
      return makeExpectedErrorNode(['new']);
    }
    callNode = parseExpression();
    if (callNode.type !== 'call') {
      return makeExpectedErrorNode(['call']);
    }
    return {
      type: 'new',
      callNode: callNode,
      column: newToken.column,
      line: newToken.line
    };
  };
  parseDelete = function() {
    var deleteToken, indexNode;
    deleteToken = grabToken('delete');
    if (deleteToken == null) {
      return makeExpectedErrorNode(['delete']);
    }
    indexNode = parseExpression();
    if (indexNode.type !== 'index') {
      return makeExpectedErrorNode(['index']);
    }
    return {
      type: 'delete',
      indexNode: indexNode,
      column: deleteToken.column,
      line: deleteToken.line
    };
  };
  parseList = function() {
    var items, listStartToken;
    listStartToken = grabToken('[');
    if (listStartToken == null) {
      return makeExpectedErrorNode(['[']);
    }
    items = [];
    if (getNextTokenType() == null) {
      items.push(makeExpectedErrorNode(['expression', ']']));
    } else if (grabToken(']') == null) {
      while (true) {
        items.push(parseExpression());
        if (grabToken(']') != null) {
          break;
        }
        if (grabToken(',') == null) {
          items.push(makeExpectedErrorNode([',', ']']));
          skipTokensTill([',', ']', 'blockStart', 'endStatement', 'blockEnd']);
          if (grabToken(']') != null) {
            break;
          }
          if (grabToken(',') == null) {
            break;
          }
        }
      }
    }
    return {
      type: 'listLiteral',
      items: items,
      column: listStartToken.column,
      line: listStartToken.line
    };
  };
  parseDictionary = function() {
    var dictionaryStartToken, entries, keyNode, valueNode;
    dictionaryStartToken = grabToken('{');
    if (dictionaryStartToken == null) {
      return makeExpectedErrorNode(['{']);
    }
    entries = [];
    if (getNextTokenType() == null) {
      entries.push(makeExpectedErrorNode(['expression', '}']));
    } else if (grabToken('}') == null) {
      while (true) {
        keyNode = grabToken('stringLiteral');
        if (grabToken(':') == null) {
          entries.push(makeExpectedErrorNode([':']));
          skipTokensTill([',', '}', 'blockStart', 'endStatement', 'blockEnd']);
          if (grabToken('}') != null) {
            break;
          }
        } else {
          valueNode = parseExpression();
          entries.push({
            keyNode: keyNode,
            valueNode: valueNode
          });
        }
        if (grabToken('}') != null) {
          break;
        }
        if (grabToken(',') == null) {
          entries.push(makeExpectedErrorNode([',', '}']));
          skipTokensTill([',', '}', 'blockStart', 'endStatement', 'blockEnd']);
          if (grabToken('}') != null) {
            break;
          }
          if (grabToken(',') == null) {
            break;
          }
        }
      }
    }
    return {
      type: 'dictionaryLiteral',
      entries: entries,
      column: dictionaryStartToken.column,
      line: dictionaryStartToken.line
    };
  };
  parseCompositeExpression = function(lhsNode, precedence) {
    var expr, newPrecedence, nextTokenType, operatorToken, precedenceValuesByTokenType, _ref;
    if (precedence == null) {
      precedence = 20;
    }
    nextTokenType = getNextTokenType();
    if (nextTokenType == null) {
      return null;
    }
    precedenceValuesByTokenType = {
      '/': 5,
      '*': 5,
      '%': 5,
      '+': 6,
      '-': 6,
      '<': 8,
      '>': 8,
      '<=': 8,
      '>=': 8,
      '=': 9,
      '!=': 9,
      'and': 13,
      'or': 14
    };
    newPrecedence = precedenceValuesByTokenType[nextTokenType];
    if (newPrecedence != null) {
      if (newPrecedence > precedence) {
        return;
      }
      precedence = newPrecedence;
    }
    switch (nextTokenType) {
      case '(':
        expr = parseCall(lhsNode);
        break;
      case '[':
        expr = parseIndex(lhsNode);
        break;
      case '.':
        grabNextToken();
        expr = parseId(lhsNode);
        break;
      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
      case '+':
      case '-':
      case '/':
      case '*':
      case '%':
      case 'and':
      case 'or':
        operatorToken = grabNextToken();
        expr = {
          type: nextTokenType,
          lhsNode: lhsNode,
          rhsNode: parseExpression(precedence),
          line: operatorToken.line,
          column: operatorToken.column
        };
        break;
      default:
        return null;
    }
    return (_ref = parseCompositeExpression(expr)) != null ? _ref : expr;
  };
  parseChildBlock = function(iterator) {
    var content, result, startDepth;
    if (iterator == null) {
      iterator = parseStatement;
    }
    content = [];
    startDepth = activeDepth;
    if (grabToken('blockStart') == null) {
      return [makeExpectedErrorNode(['blockStart'])];
    }
    activeDepth++;
    while (true) {
      result = iterator();
      if (result != null) {
        content.push(result);
      }
      if (activeDepth === startDepth || tokenStack.length === 0) {
        break;
      }
    }
    return content;
  };
  parseIf = function() {
    var content, elseContent, elseIfNode, ifToken, testNode;
    ifToken = grabToken('if');
    if (ifToken == null) {
      return makeExpectedErrorNode(['if']);
    }
    testNode = parseExpression();
    content = parseChildBlock();
    if (grabToken('else') != null) {
      if (getNextTokenType() === 'if') {
        elseIfNode = parseIf();
      } else {
        elseContent = parseChildBlock();
      }
    }
    return {
      type: 'if',
      testNode: testNode,
      content: content,
      elseIfNode: elseIfNode,
      elseContent: elseContent,
      line: ifToken.line,
      column: ifToken.column
    };
  };
  parseWhile = function() {
    var content, testNode, whileToken;
    whileToken = grabToken('while');
    if (whileToken == null) {
      return makeExpectedErrorNode(['while']);
    }
    testNode = parseExpression();
    content = parseChildBlock();
    return {
      type: 'while',
      testNode: testNode,
      content: content,
      line: whileToken.line,
      column: whileToken.column
    };
  };
  parseFor = function() {
    var firstIdNode, forNode, forToken, secondIdNode;
    forToken = grabToken('for');
    if (forToken == null) {
      return makeExpectedErrorNode(['for']);
    }
    firstIdNode = parseId();
    if (grabToken(',') != null) {
      secondIdNode = parseId();
    }
    if (grabToken('in') != null) {
      forNode = {
        type: 'iterateList',
        valueNode: {
          type: 'local',
          idNode: firstIdNode,
          varTypeSymbolPath: 'blackbox'
        },
        line: forToken.line,
        column: forToken.column
      };
      if (secondIdNode != null) {
        forNode.indexNode = {
          type: 'local',
          idNode: secondIdNode,
          varTypeSymbolPath: 'number'
        };
      }
    } else if (grabToken('of') != null) {
      forNode = {
        type: 'iterateDictionary',
        keyNode: {
          type: 'local',
          idNode: firstIdNode,
          varTypeSymbolPath: 'string'
        },
        line: forToken.line,
        column: forToken.column
      };
      if (secondIdNode != null) {
        forNode.valueNode = {
          type: 'local',
          idNode: secondIdNode,
          varTypeSymbolPath: 'blackbox'
        };
      }
    } else {
      return makeExpectedErrorNode(['in', 'of']);
    }
    forNode.iteratorNode = parseExpression();
    forNode.content = parseChildBlock();
    return forNode;
  };
  parseDoc = function() {
    var docLines, docLiteralToken, docToken, innerDocLiteralToken, _ref;
    docToken = grabToken('#');
    if (docToken == null) {
      return makeExpectedErrorNode(['#']);
    }
    docLines = [];
    docLiteralToken = grabToken('docLiteral');
    if (docLiteralToken != null) {
      docLines.push(docLiteralToken.value);
    } else {
      if (grabToken('blockStart') == null) {
        return makeExpectedErrorNode(['blockStart']);
      }
      while (true) {
        innerDocLiteralToken = (_ref = grabToken('docLiteral')) != null ? _ref : grabToken('blockEnd');
        if (innerDocLiteralToken == null) {
          return makeExpectedErrorNode(['text', 'blockEnd']);
        }
        if (innerDocLiteralToken.type === 'blockEnd') {
          break;
        } else {
          docLines.push(innerDocLiteralToken.value);
        }
      }
    }
    return {
      type: '#',
      value: docLines.join('\n', {
        line: docToken.line,
        column: docToken.column
      })
    };
  };
  parseNamespace = function(opts) {
    var content, idNode;
    opts || (opts = {});
    if (grabToken('namespace') == null) {
      return makeExpectedErrorNode(['namespace']);
    }
    idNode = parseId();
    content = parseChildBlock(parseNamespaceStatement);
    return {
      type: 'namespace',
      idNode: idNode,
      content: content
    };
  };
  parseNamespaceStatement = function() {
    var expectedError, targetNode;
    switch (getNextTokenType()) {
      case null:
        return null;
      case 'endStatement':
        grabNextToken();
        return null;
      case 'blockEnd':
        grabNextToken();
        activeDepth--;
        return null;
      case 'id':
        targetNode = parseExpression();
        if (getNextTokenType() !== 'id') {
          makeExpectedErrorNode(['declaration']);
          skipTokensTill(['endStatement', 'blockEnd']);
          return null;
        }
        return parseDeclaration(targetNode, 'local');
      case '#':
        return parseDoc();
      case 'namespace':
        return parseNamespace();
      case 'blueprint':
        return parseBlueprint();
      case 'machine':
        return parseMachine();
      case 'transcendental':
        return parseMachine({
          transcendentalNode: grabNextToken()
        });
      case 'abstract':
        return parseBlueprint({
          abstractNode: grabNextToken()
        });
      case 'return':
        return parseReturn();
      default:
        expectedError = makeExpectedErrorNode(['namespaceStatement']);
        grabNextToken();
        return expectedError;
    }
  };
  parseBlueprint = function(opts) {
    var blueprintToken, content, idNode, parentBlueprintIdNode;
    blueprintToken = grabToken('blueprint');
    if (blueprintToken == null) {
      return makeExpectedErrorNode(['blueprint']);
    }
    if (opts == null) {
      opts = {};
    }
    idNode = parseId();
    if (grabToken('extends') != null) {
      parentBlueprintIdNode = parseParentedId();
    }
    if (getNextTokenType() === 'blockStart') {
      content = parseChildBlock(parseBlueprintStatement);
    } else {
      content = [];
    }
    return {
      type: 'blueprint',
      idNode: idNode,
      parentBlueprintIdNode: parentBlueprintIdNode,
      content: content,
      abstractNode: opts.abstractNode,
      line: blueprintToken.line,
      column: blueprintToken.column
    };
  };
  parseBlueprintStatement = function() {
    var expectedError;
    switch (getNextTokenType()) {
      case null:
        return null;
      case 'endStatement':
        grabNextToken();
        return null;
      case 'blockEnd':
        grabNextToken();
        activeDepth--;
        return null;
      case '#':
        return parseDoc();
      case 'properties':
        return parseBlueprintProperties();
      case 'construct':
      case 'action':
      case 'machine':
        return parseBlueprintFunction();
      case 'transcendental':
        return parseBlueprintFunction({
          transcendentalNode: grabNextToken()
        });
      case 'abstract':
        return parseBlueprintFunction({
          abstractNode: grabNextToken()
        });
      default:
        expectedError = makeExpectedErrorNode(['blueprintStatement']);
        grabNextToken();
        return expectedError;
    }
  };
  parsePropertyDeclaration = function() {
    var propertyNode, readonly, typeIdNode;
    if (grabToken('endStatement')) {
      return null;
    }
    if (grabToken('blockEnd') != null) {
      activeDepth--;
      return null;
    }
    readonly = grabToken('readonly') != null;
    typeIdNode = parseParentedId();
    typeIdNode.optional = grabToken('?') != null;
    propertyNode = parseDeclaration(typeIdNode, 'property');
    propertyNode.readonlyNode = readonly;
    grabToken('endStatement');
    return propertyNode;
  };
  parseBlueprintProperties = function() {
    var content, propertiesToken;
    propertiesToken = grabToken('properties');
    if (propertiesToken == null) {
      return makeExpectedErrorNode(['properties']);
    }
    content = parseChildBlock(parsePropertyDeclaration);
    return {
      type: 'properties',
      content: content,
      line: propertiesToken.line,
      column: propertiesToken.column
    };
  };
  parseMachine = function(opts) {
    var content, idNode, machineToken, params, returnTypeIdNode;
    machineToken = grabToken('machine');
    if (machineToken == null) {
      return makeExpectedErrorNode(['machine']);
    }
    if (opts == null) {
      opts = {};
    }
    idNode = parseId();
    if (getNextTokenType() === '(') {
      params = parseParametersList();
    }
    if (getNextTokenType() === ':') {
      returnTypeIdNode = parseReturnTypeId();
    }
    if (opts.transcendentalNode == null) {
      content = parseChildBlock();
    } else if (getNextTokenType() === 'blockStart') {
      content = [
        makeErrorNode('unexpected', {
          found: 'blockStart'
        })
      ];
      parseChildBlock();
    }
    return {
      type: 'machine',
      idNode: idNode,
      parameters: params != null ? params : [],
      returnTypeIdNode: returnTypeIdNode,
      content: content,
      transcendentalNode: opts.transcendentalNode,
      line: machineToken.line,
      column: machineToken.column
    };
  };
  parseBlueprintFunction = function(opts) {
    var content, functionToken, idNode, params, returnTypeIdNode;
    opts || (opts = {});
    functionToken = grabToken(['construct', 'action', 'machine']);
    if (functionToken == null) {
      return makeExpectedErrorNode(['construct', 'machine', 'action']);
    }
    if (functionToken.type !== 'construct') {
      idNode = parseId();
    }
    if (getNextTokenType() === '(') {
      params = parseParametersList();
    }
    if (getNextTokenType() === ':') {
      returnTypeIdNode = parseReturnTypeId();
    }
    if ((opts.transcendentalNode == null) && (opts.abstractNode == null)) {
      if (getNextTokenType() === 'blockStart') {
        content = parseChildBlock();
      } else {
        content = [];
      }
    } else if (getNextTokenType() === 'blockStart') {
      content = [
        makeErrorNode('unexpected', {
          found: 'blockStart'
        })
      ];
      parseChildBlock();
    }
    return {
      type: functionToken.type,
      idNode: idNode,
      parameters: params != null ? params : [],
      returnTypeIdNode: returnTypeIdNode,
      content: content,
      transcendentalNode: opts.transcendentalNode,
      abstractNode: opts.abstractNode,
      line: functionToken.line,
      column: functionToken.column
    };
  };
  parseParametersList = function() {
    var params, parseParameter;
    if (grabToken('(') == null) {
      return [makeExpectedErrorNode('(')];
    }
    parseParameter = function() {
      var idNode, typeIdNode;
      typeIdNode = parseParentedId();
      typeIdNode.optional = grabToken('?') != null;
      idNode = parseId();
      return {
        type: 'parameter',
        typeIdNode: typeIdNode,
        idNode: idNode,
        line: typeIdNode.line,
        column: typeIdNode.column
      };
    };
    params = [];
    if (getNextTokenType() == null) {
      params.push(makeExpectedErrorNode(['declaration', ')']));
    } else if (grabToken(')') == null) {
      while (true) {
        params.push(parseParameter());
        if (grabToken(')') != null) {
          break;
        }
        if (grabToken(',') == null) {
          params.push(makeExpectedErrorNode([',', ')']));
          skipTokensTill([',', ')', ':', 'blockStart', 'endStatement', 'blockEnd']);
          if (grabToken(')') != null) {
            break;
          }
          if (grabToken(',') == null) {
            break;
          }
        }
      }
    }
    return params;
  };
  parseReturnTypeId = function() {
    var idNode;
    if (grabToken(':') == null) {
      return makeExpectedErrorNode([':']);
    }
    idNode = parseParentedId();
    idNode.optional = grabToken('?') != null;
    return idNode;
  };
  parseReturn = function() {
    var returnToken, valueNode, _ref;
    returnToken = grabToken('return');
    if (returnToken == null) {
      return makeExpectedErrorNode(['return']);
    }
    if ((_ref = getNextTokenType()) !== 'blockEnd' && _ref !== 'endStatement') {
      valueNode = parseExpression();
    }
    return {
      type: 'return',
      valueNode: valueNode,
      column: returnToken.column,
      line: returnToken.line
    };
  };
  parseBreak = function() {
    var breakToken;
    breakToken = grabToken('break');
    if (breakToken == null) {
      return makeExpectedErrorNode(['break']);
    }
    return {
      type: 'break',
      line: breakToken.line,
      column: breakToken.column
    };
  };
  parseContinue = function() {
    var continueToken;
    continueToken = grabToken('continue');
    if (continueToken == null) {
      return makeExpectedErrorNode(['continue']);
    }
    return {
      type: 'continue',
      line: continueToken.line,
      column: continueToken.column
    };
  };
  while (tokenStack.length > 0) {
    result = parseGlobalDeclaration();
    if (result === 'endGlobalDeclarations') {
      break;
    }
    if (result != null) {
      ast.push(result);
    }
  }
  while (tokenStack.length > 0) {
    result = parseStatement();
    if (result != null) {
      ast.push(result);
    }
  }
  return callback(null, ast, errors);
};



},{}],8:[function(_dereq_,module,exports){
module.exports = function(error, lineOfCode) {
  var message;
  message = (function() {
    var _ref;
    switch (error.errorType) {
      case 'expected':
        return "Expected " + (error.data.expected.join(' or ')) + ", got " + (error.data.found || 'end of file') + " instead";
      case 'unexpected':
        return "Unexpected " + (error.data.found || 'end of file');
      case 'unknownSymbol':
        return "Unknown symbol: " + error.node.name;
      case 'duplicateSymbol':
        return "Duplicate symbol: " + error.data.path;
      case 'uninitializedBox':
        return "Box must be initialized or have an explicit type";
      case 'invalidArgumentType':
        return "Expected " + error.data.parameterTypeSymbol.path + " argument, got " + ((_ref = error.data.argumentTypeSymbol) != null ? _ref.path : void 0) + " instead";
      default:
        return error.errorType;
    }
  })();
  console.log("" + (error.line + 1) + ":" + (error.column + 1) + ": " + message);
  console.log(lineOfCode);
  console.log(Array(error.column + 1).join(' ') + '^\n');
};



},{}],9:[function(_dereq_,module,exports){
var cloneSymbolsTable, symbolizer;

module.exports = symbolizer = {};

symbolizer.findClosestSymbol = function(name, state, symbols) {
  var blueprintSymbol, machineSymbol, namespaceSymbol, path, rootSymbol, scopeSymbol, _ref, _ref1, _ref2;
  if (symbols == null) {
    throw new Error("Symbols can't be null");
  }
  path = '';
  rootSymbol = symbols[path + name];
  if (state.namespace != null) {
    path += "" + state.namespace.name + ".";
    namespaceSymbol = symbols[path + name];
  }
  if (state.blueprint != null) {
    path += "" + state.blueprint.name + ".";
    blueprintSymbol = symbols[path + name];
  }
  if (state.machine != null) {
    path += "" + state.machine.name + ".";
    machineSymbol = symbols[path + name];
  }
  if (state.scope != null) {
    path += "" + state.scope.name + ".";
    scopeSymbol = symbols[path + name];
  }
  return (_ref = (_ref1 = (_ref2 = scopeSymbol != null ? scopeSymbol : machineSymbol) != null ? _ref2 : blueprintSymbol) != null ? _ref1 : namespaceSymbol) != null ? _ref : rootSymbol;
};

symbolizer.getSymbolForNode = function(node, state, symbols, asParent) {
  var parentNode, parentState, parentSymbol, parentTypeIdNode, symbol, symbolName, targetSymbol, _ref, _ref1;
  if (asParent == null) {
    asParent = false;
  }
  if (symbols == null) {
    throw new Error("Symbols can't be null");
  }
  if (node.parentNode != null) {
    switch (node.type) {
      case 'id':
        parentNode = node.parentNode;
        parentState = state;
        while (parentNode != null) {
          parentSymbol = symbolizer.getSymbolForNode(parentNode, parentState, symbols, true);
          if (parentSymbol == null) {
            return null;
          }
          symbolName = "" + parentSymbol.path + "." + node.name;
          symbol = symbolizer.findClosestSymbol(symbolName, state, symbols);
          if (symbol != null) {
            break;
          }
          parentNode = parentSymbol.node.parentBlueprintIdNode;
          parentState = parentSymbol.state;
        }
        break;
      case 'index':
        return symbols.blackbox;
      default:
        console.log("symbolizer.getSymbolForNode: Unhandled node type with parent");
        console.log(node.type);
    }
  } else if (node.type === 'call') {
    targetSymbol = symbolizer.getSymbolForNode(node.targetNode, state, symbols, true);
    if (targetSymbol != null) {
      if (targetSymbol.node.type === 'blueprint') {
        symbol = targetSymbol;
      } else if (targetSymbol.node.returnTypeIdNode != null) {
        symbol = symbolizer.getSymbolForNode(targetSymbol.node.returnTypeIdNode, targetSymbol.state, symbols, true);
      }
    }
  } else {
    symbolName = node.type === 'self' ? (_ref = state.blueprint) != null ? _ref.name : void 0 : node.name;
    if (symbolName != null) {
      symbol = symbolizer.findClosestSymbol(symbolName, state, symbols);
    }
  }
  if (symbol == null) {
    return null;
  }
  if (asParent && ((_ref1 = symbol.node.type) === 'local' || _ref1 === 'parameter' || _ref1 === 'property')) {
    if (symbol.node.varTypeSymbolPath != null) {
      symbol = symbols[symbol.node.varTypeSymbolPath];
    } else {
      symbolName = symbol.node.typeIdNode.name;
      parentTypeIdNode = symbol.node.typeIdNode.parentNode;
      while (parentTypeIdNode != null) {
        symbolName = "" + parentTypeIdNode.name + "." + symbolName;
        parentTypeIdNode = parentTypeIdNode.parentNode;
      }
      symbol = symbolizer.findClosestSymbol(symbolName, symbol.state, symbols);
    }
  }
  return symbol;
};

cloneSymbolsTable = function(sourceSymbols) {
  var key, symbols, value;
  symbols = {};
  for (key in sourceSymbols) {
    value = sourceSymbols[key];
    symbols[key] = value;
  }
  return symbols;
};

symbolizer.buildSymbolsTable = function(pass, ast, globalSymbols, callback) {
  var canAssign, canAssignType, checkExpression, checkExpressionType, checkSymbolExists, errors, getExpressionTypeSymbol, localSymbols, node, pushError, registerNewSymbol, resolveVarType, state, symbolize, symbolizeGlobal, symbolizeGlobalChild, symbolizeLocal, _i, _len;
  errors = [];
  pushError = function(node, errorType, data) {
    errors.push({
      type: 'error',
      errorType: errorType,
      data: data,
      node: node,
      line: node.line,
      column: node.column
    });
  };
  state = {
    namespace: null,
    blueprint: null,
    machine: null,
    scope: null,
    scopeIndex: 0
  };
  if (globalSymbols == null) {
    globalSymbols = cloneSymbolsTable(_dereq_('./boilerplate').builtinSymbols);
  }
  localSymbols = cloneSymbolsTable(globalSymbols);
  registerNewSymbol = function(node, global) {
    var key, path, symbol, symbolState, val, _ref, _ref1;
    if (global == null) {
      throw new Error('registerNewSymbol takes 2 arguments');
    }
    path = '';
    if (state.namespace != null) {
      path += "" + state.namespace.name + ".";
    }
    if (state.blueprint != null) {
      path += "" + state.blueprint.name + ".";
    }
    if (state.machine != null) {
      path += "" + state.machine.name + ".";
    }
    if (state.scope != null) {
      path += "" + state.scope.name + ".";
    }
    path += (_ref = (_ref1 = node.idNode) != null ? _ref1.name : void 0) != null ? _ref : "%" + node.type;
    if (localSymbols[path] != null) {
      pushError(node, 'duplicateSymbol', {
        path: path
      });
      return;
    }
    symbolState = {};
    for (key in state) {
      val = state[key];
      symbolState[key] = val;
    }
    symbol = {
      path: path,
      node: node,
      state: symbolState
    };
    localSymbols[path] = symbol;
    if (global) {
      globalSymbols[path] = symbol;
    }
  };
  getExpressionTypeSymbol = function(exprNode) {
    var symbol;
    switch (exprNode.type) {
      case 'numberLiteral':
        return localSymbols.number;
      case 'stringLiteral':
        return localSymbols.string;
      case 'booleanLiteral':
        return localSymbols.boolean;
      case 'listLiteral':
        return localSymbols.List;
      case 'dictionaryLiteral':
        return localSymbols.Dictionary;
      case 'index':
        return localSymbols.blackbox;
      case 'nothing':
        return null;
      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
      case 'and':
      case 'or':
      case 'not':
        return localSymbols.boolean;
      case 'negate':
      case '()':
        return getExpressionTypeSymbol(exprNode.innerExpressionNode);
      case 'self':
        return symbolizer.getSymbolForNode(exprNode, state, localSymbols);
      case '+':
      case '-':
      case '/':
      case '*':
      case '%':
        return getExpressionTypeSymbol(exprNode.lhsNode);
      case 'call':
        return symbolizer.getSymbolForNode(exprNode, state, localSymbols);
      case 'new':
        symbol = symbolizer.getSymbolForNode(exprNode.callNode, state, localSymbols);
        if (symbol.node.abstractNode != null) {
          pushError(exprNode, 'instantiateAbstract');
        }
        return symbol;
      case 'id':
        symbol = symbolizer.getSymbolForNode(exprNode, state, localSymbols);
        if (symbol != null) {
          if (symbol.node.type === 'blueprint') {
            return symbol;
          } else if (symbol.node.varTypeSymbolPath != null) {
            return localSymbols[symbol.node.varTypeSymbolPath];
          } else {
            return symbolizer.getSymbolForNode(symbol.node.typeIdNode, symbol.state, localSymbols);
          }
        } else {
          return null;
        }
        break;
      default:
        console.log("symbolizer getExpressionTypeSymbol: Unhandled node type");
        console.log(exprNode);
        return null;
    }
  };
  canAssign = function(lhsNode, rhsNode) {
    return canAssignType(getExpressionTypeSymbol(lhsNode), getExpressionTypeSymbol(rhsNode));
  };
  canAssignType = function(lhsTypeSymbol, rhsTypeSymbol) {
    return lhsTypeSymbol === localSymbols.blackbox || lhsTypeSymbol === rhsTypeSymbol;
  };
  checkSymbolExists = function(node) {
    if (symbolizer.getSymbolForNode(node, state, localSymbols) == null) {
      pushError(node, 'unknownSymbol');
    }
  };
  checkExpression = function(node) {
    var argument, argumentTypeSymbol, callNode, i, lhsTypeSymbol, parameter, parameterTypeSymbol, rhsTypeSymbol, targetSymbol, _i, _len, _ref, _ref1;
    switch (node.type) {
      case 'numberLiteral':
      case 'stringLiteral':
      case 'booleanLiteral':
      case 'nothing':
        break;
      case 'listLiteral':
      case 'dictionaryLiteral':
        break;
      case 'id':
        checkSymbolExists(node);
        break;
      case 'self':
        if ((state.blueprint == null) || (state.machine == null) || state.machine.type === 'machine') {
          pushError(node, 'noSelf');
        }
        break;
      case 'negate':
      case 'not':
        checkExpression(node.innerExpressionNode);
        break;
      case 'call':
      case 'new':
        callNode = node.type === 'new' ? node.callNode : node;
        checkExpression(callNode.targetNode);
        targetSymbol = symbolizer.getSymbolForNode(callNode.targetNode, state, localSymbols);
        if ((targetSymbol != null ? targetSymbol.node.type : void 0) === 'blueprint') {
          if (node.type !== 'new') {
            pushError(node, 'constructorCall');
          }
          targetSymbol = localSymbols["" + targetSymbol.path + ".%construct"];
        }
        if (targetSymbol != null) {
          if (callNode["arguments"].length !== targetSymbol.node.parameters.length) {
            pushError(node, 'wrongArgumentCount', callNode["arguments"].length, targetSymbol.node.parameters.length);
          }
          _ref = callNode["arguments"];
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            argument = _ref[i];
            checkExpression(argument);
            parameter = targetSymbol.node.parameters[i];
            parameterTypeSymbol = localSymbols[parameter != null ? parameter.varTypeSymbolPath : void 0];
            argumentTypeSymbol = getExpressionTypeSymbol(argument);
            if ((parameterTypeSymbol != null) && !canAssignType(parameterTypeSymbol, argumentTypeSymbol)) {
              pushError(argument, 'invalidArgumentType', {
                parameterTypeSymbol: parameterTypeSymbol,
                argumentTypeSymbol: argumentTypeSymbol
              });
            }
          }
        } else {
          pushError(node, 'cantFindCallTargetSymbol', callNode.targetNode);
        }
        break;
      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
      case '+':
      case '-':
      case '/':
      case '*':
      case '%':
        lhsTypeSymbol = getExpressionTypeSymbol(node.lhsNode);
        rhsTypeSymbol = getExpressionTypeSymbol(node.rhsNode);
        if (!canAssignType(lhsTypeSymbol, rhsTypeSymbol)) {
          pushError(node, 'incompatibleComparison');
        }
        if (node.type === '+') {
          if (lhsTypeSymbol !== localSymbols.string && lhsTypeSymbol !== localSymbols.number) {
            pushError(node, 'invalidOperandType');
          }
        } else if ((_ref1 = node.type) === '<' || _ref1 === '>' || _ref1 === '<=' || _ref1 === '>=' || _ref1 === '-' || _ref1 === '/' || _ref1 === '*' || _ref1 === '%') {
          if (lhsTypeSymbol !== localSymbols.number) {
            pushError(node, 'invalidOperandType');
          }
        }
        break;
      case 'index':
        checkExpression(node.indexNode);
        checkExpression(node.parentNode);
        break;
      case 'error':
        break;
      default:
        console.log('symbolizer checkExpression: Unhandled node type');
        console.log(node);
    }
  };
  checkExpressionType = function(exprNode, typeSymbol) {
    if (getExpressionTypeSymbol(exprNode) !== typeSymbol) {
      pushError(exprNode, 'incorrectType');
    }
  };
  resolveVarType = function(node) {
    var typesAreCompatible, valueTypeSymbol, varTypeSymbol;
    checkSymbolExists(node.typeIdNode);
    if (node.typeIdNode.name === 'box') {
      if (node.valueNode == null) {
        pushError(node, 'uninitializedBox');
        return;
      }
      varTypeSymbol = getExpressionTypeSymbol(node.valueNode);
      if (varTypeSymbol == null) {
        pushError(node.valueNode, 'unknownSymbol');
      }
      node.varTypeSymbolPath = varTypeSymbol != null ? varTypeSymbol.path : void 0;
      return;
    }
    varTypeSymbol = symbolizer.getSymbolForNode(node.typeIdNode, state, localSymbols);
    node.varTypeSymbolPath = varTypeSymbol != null ? varTypeSymbol.path : void 0;
    if ((varTypeSymbol != null) && (node.valueNode != null)) {
      valueTypeSymbol = getExpressionTypeSymbol(node.valueNode);
      typesAreCompatible = valueTypeSymbol == null ? node.typeIdNode.optional : canAssignType(varTypeSymbol, valueTypeSymbol);
      if (!typesAreCompatible) {
        pushError(node, 'incompatibleAssignment');
      }
    }
  };
  symbolizeGlobal = function(node, callback) {
    var subNode, _i, _j, _len, _len1, _ref, _ref1;
    switch (node.type) {
      case 'namespace':
        if (localSymbols[node.idNode.name] == null) {
          registerNewSymbol(node, true);
        }
        state.namespace = {
          name: node.idNode.name
        };
        _ref = node.content;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          subNode = _ref[_i];
          symbolizeGlobalChild(subNode);
        }
        state.namespace = null;
        break;
      case 'blueprint':
        registerNewSymbol(node, true);
        state.blueprint = {
          name: node.idNode.name
        };
        _ref1 = node.content;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          subNode = _ref1[_j];
          symbolizeGlobalChild(subNode);
        }
        state.blueprint = null;
        break;
      case 'machine':
        registerNewSymbol(node, true);
    }
  };
  symbolizeGlobalChild = function(node, callback) {
    var parentNamespace, subNode, symbolPath, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
    switch (node.type) {
      case 'namespace':
        symbolPath = node.name;
        if (state.namespace != null) {
          symbolPath = "" + state.namespace + "." + symbolPath;
        }
        if (localSymbols[symbolPath] == null) {
          registerNewSymbol(node, true);
        }
        parentNamespace = state.namespace;
        state.namespace = {
          name: symbolPath
        };
        _ref = node.content;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          subNode = _ref[_i];
          symbolizeGlobalChild(subNode);
        }
        state.namespace = parentNamespace;
        break;
      case 'blueprint':
        registerNewSymbol(node, true);
        state.blueprint = {
          name: node.idNode.name
        };
        _ref1 = node.content;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          subNode = _ref1[_j];
          symbolizeGlobalChild(subNode);
        }
        state.blueprint = null;
        break;
      case 'construct':
      case 'action':
      case 'machine':
        registerNewSymbol(node, true);
        break;
      case 'local':
      case 'property':
        resolveVarType(node);
        registerNewSymbol(node, true);
        break;
      case 'properties':
        _ref2 = node.content;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          subNode = _ref2[_k];
          symbolizeGlobalChild(subNode);
        }
    }
  };
  symbolizeLocal = function(node, callback) {
    var oldMachine, oldScope, paramNode, parentNamespace, subNode, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _m, _n, _o, _p, _q, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
    switch (node.type) {
      case 'namespace':
        parentNamespace = state.namespace;
        if (parentNamespace != null) {
          state.namespace = {
            name: "" + parentNamespace.name + "." + node.idNode.name
          };
        } else {
          state.namespace = {
            name: node.idNode.name
          };
        }
        _ref = node.content;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          subNode = _ref[_i];
          symbolizeLocal(subNode);
        }
        state.namespace = parentNamespace;
        break;
      case 'blueprint':
        state.blueprint = {
          name: node.idNode.name
        };
        if (node.parentBlueprintIdNode != null) {
          checkSymbolExists(node.parentBlueprintIdNode);
        }
        _ref1 = node.content;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          subNode = _ref1[_j];
          symbolizeLocal(subNode);
        }
        state.blueprint = null;
        break;
      case 'construct':
      case 'action':
      case 'machine':
        oldMachine = state.machine;
        state.machine = node.type === 'construct' ? {
          name: '%construct',
          type: 'construct'
        } : {
          name: node.idNode.name,
          type: node.type
        };
        _ref2 = node.parameters;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          paramNode = _ref2[_k];
          symbolizeLocal(paramNode);
        }
        if ((node.transcendentalNode == null) && (node.abstractNode == null)) {
          _ref3 = node.content;
          for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
            subNode = _ref3[_l];
            symbolizeLocal(subNode);
          }
        }
        state.machine = oldMachine;
        break;
      case 'local':
      case 'parameter':
        if (node.valueNode != null) {
          checkExpression(node.valueNode);
        }
        if ((state.namespace == null) && (state.blueprint == null) || (state.machine != null)) {
          resolveVarType(node);
          registerNewSymbol(node, false);
        }
        break;
      case '<-':
      case '+=':
      case '-=':
      case '*=':
      case '/=':
      case '%=':
        checkSymbolExists(node.targetNode);
        checkExpression(node.valueNode);
        if (!canAssign(node.targetNode, node.valueNode)) {
          pushError(node, 'incompatibleAssignment');
        }
        break;
      case 'call':
      case 'new':
        checkExpression(node);
        break;
      case 'delete':
        checkExpression(node.indexNode);
        break;
      case 'if':
        checkExpressionType(node.testNode, localSymbols.boolean);
        oldScope = state.scope;
        state.scope = {
          name: "" + node.type + "_" + (state.scopeIndex++),
          index: state.scopeIndex
        };
        _ref4 = node.content;
        for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
          subNode = _ref4[_m];
          symbolizeLocal(subNode);
        }
        state.scope = oldScope;
        if (node.elseIfNode != null) {
          symbolizeLocal(node.elseIfNode);
        } else if (node.elseContent != null) {
          state.scope = {
            name: "" + node.type + "_" + (state.scopeIndex++),
            index: state.scopeIndex
          };
          _ref5 = node.elseContent;
          for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
            subNode = _ref5[_n];
            symbolizeLocal(subNode);
          }
          state.scope = oldScope;
        }
        break;
      case 'while':
        checkExpressionType(node.testNode, localSymbols.boolean);
        oldScope = state.scope;
        state.scope = {
          name: "" + node.type + "_" + (state.scopeIndex++),
          index: state.scopeIndex
        };
        _ref6 = node.content;
        for (_o = 0, _len6 = _ref6.length; _o < _len6; _o++) {
          subNode = _ref6[_o];
          symbolizeLocal(subNode);
        }
        state.scope = oldScope;
        break;
      case 'iterateList':
      case 'iterateDictionary':
        oldScope = state.scope;
        state.scope = {
          name: "" + node.type + "_" + (state.scopeIndex++),
          index: state.scopeIndex
        };
        if (node.type === 'iterateList') {
          registerNewSymbol(node.valueNode, false);
          if (node.indexNode != null) {
            registerNewSymbol(node.indexNode, false);
          }
        } else {
          registerNewSymbol(node.keyNode, false);
          if (node.valueNode != null) {
            registerNewSymbol(node.valueNode, false);
          }
        }
        _ref7 = node.content;
        for (_p = 0, _len7 = _ref7.length; _p < _len7; _p++) {
          subNode = _ref7[_p];
          symbolizeLocal(subNode);
        }
        state.scope = oldScope;
        break;
      case 'properties':
        _ref8 = node.content;
        for (_q = 0, _len8 = _ref8.length; _q < _len8; _q++) {
          subNode = _ref8[_q];
          if (subNode.valueNode != null) {
            checkExpression(subNode.valueNode);
          }
        }
        break;
      case 'return':
        if (node.valueNode != null) {
          checkExpression(node.valueNode);
        }
        break;
      case 'error':
      case '#':
      case 'break':
      case 'continue':
        break;
      default:
        console.log('symbolizer.symbolize: Unhandled node type');
        console.log(node);
    }
  };
  symbolize = pass === 'global' ? symbolizeGlobal : symbolizeLocal;
  for (_i = 0, _len = ast.length; _i < _len; _i++) {
    node = ast[_i];
    symbolize(node);
  }
  return callback(null, (pass === 'global' ? globalSymbols : localSymbols), errors);
};



},{"./boilerplate":4}],10:[function(_dereq_,module,exports){
var forbiddenChars, integerRegex, keywords, validIdentifierRegex;

validIdentifierRegex = /^[A-Za-z][A-Za-z0-9_]*$/;

integerRegex = /^-?[0-9]+$/;

forbiddenChars = ['\t'];

keywords = ['if', 'else', 'for', 'in', 'of', 'while', 'break', 'continue', 'return', 'namespace', 'machine', 'blueprint', 'properties', 'construct', 'action', '#', 'abstract', 'transcendental', 'readonly', 'extends', 'self', 'nothing', 'new', 'delete', 'and', 'or', 'not', '<-', '+=', '-=', '*=', '/=', '%=', '+', '-', '*', '/', '%', '=', '!=', '<', '>', '<=', '>='];

module.exports = function(code, callback) {
  var acc, blockDepth, char, docBlockDepth, docLine, endToken, fail, i, lastChar, lastTokenType, location, makeTokenFromValue, pushToken, removeLastToken, tokenStartLocation, tokens, updateTokenStartLocation, _i, _ref;
  location = {
    line: 0,
    column: 0
  };
  tokenStartLocation = {
    line: 0,
    column: 0
  };
  code = code.replace(/\n( *)\n/g, '\n\n');
  fail = function(message) {
    var error;
    error = new Error(message);
    error.line = location.line;
    error.column = location.column;
    callback(error);
    return false;
  };
  acc = '';
  lastChar = null;
  tokens = [];
  blockDepth = 0;
  docLine = false;
  docBlockDepth = null;
  makeTokenFromValue = function(val) {
    var unescapedValue;
    if (val[0] === ' ') {
      return {
        type: 'spaces',
        count: val.length
      };
    } else if ((docBlockDepth == null) && !docLine) {
      if (keywords.indexOf(val) !== -1) {
        return {
          type: val
        };
      } else if (!isNaN(val)) {
        return {
          type: 'numberLiteral',
          value: val
        };
      } else if (val[0] === '"' && val[val.length - 1] === '"') {
        unescapedValue = val.substring(1, val.length - 1);
        unescapedValue = unescapedValue.replace(/\\"/g, '"');
        return {
          type: 'stringLiteral',
          value: unescapedValue
        };
      } else if (val === 'true' || val === 'false') {
        return {
          type: 'booleanLiteral',
          value: val
        };
      } else if (validIdentifierRegex.test(val)) {
        return {
          type: 'id',
          value: val
        };
      }
    } else {
      return {
        type: 'docLiteral',
        value: val
      };
    }
    return null;
  };
  updateTokenStartLocation = function() {
    return tokenStartLocation = {
      line: location.line,
      column: location.column
    };
  };
  pushToken = function(token) {
    token.line = tokenStartLocation.line;
    token.column = tokenStartLocation.column;
    return tokens.push(token);
  };
  lastTokenType = function() {
    if (tokens.length === 0) {
      return null;
    }
    return tokens[tokens.length - 1].type;
  };
  removeLastToken = function() {
    return tokens.splice(tokens.length - 1, 1);
  };
  endToken = function() {
    var newBlockDepth, token;
    if (acc.length === 0) {
      return true;
    }
    token = makeTokenFromValue(acc);
    if (token == null) {
      return fail("Invalid token: " + acc);
    }
    acc = '';
    if (lastTokenType() === '#') {
      docLine = true;
    } else if (lastTokenType() === 'docLiteral' && docLine) {
      docLine = false;
    } else if (lastTokenType() === 'linebreak') {
      removeLastToken();
      docLine = false;
      if (token.type === 'spaces') {
        if (token.count % 2 !== 0) {
          return fail("Uneven indent");
        }
        newBlockDepth = token.count / 2;
      } else {
        newBlockDepth = 0;
        docBlockDepth = null;
      }
      if (blockDepth < newBlockDepth) {
        if (newBlockDepth - blockDepth > 1) {
          return fail("Invalid indent");
        }
        if (docBlockDepth == null) {
          if (lastTokenType() === '#') {
            docBlockDepth = 1;
          }
        } else {
          docBlockDepth++;
        }
        pushToken({
          type: 'blockStart'
        });
        blockDepth++;
      } else if (blockDepth > newBlockDepth) {
        if (docBlockDepth != null) {
          docBlockDepth--;
          if (docBlockDepth === 0) {
            docBlockDepth = null;
          }
        }
        while (blockDepth > newBlockDepth) {
          pushToken({
            type: 'blockEnd'
          });
          blockDepth--;
        }
      } else if (docBlockDepth == null) {
        pushToken({
          type: 'endStatement'
        });
      }
    }
    if (token.type === 'spaces') {
      if (tokens.length === 0) {
        return fail("Invalid indent at start");
      }
    } else {
      pushToken(token);
    }
    updateTokenStartLocation();
    return true;
  };
  for (i = _i = 0, _ref = code.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    char = code[i];
    if (forbiddenChars.indexOf(char) !== -1) {
      return fail("Encountered forbidden char: '" + char + "'");
    }
    if ((docBlockDepth != null) || docLine) {
      switch (char) {
        case '\r':
          if (!endToken()) {
            return;
          }
          break;
        case '\n':
          if (!endToken()) {
            return;
          }
          if (lastTokenType() !== 'linebreak') {
            pushToken({
              type: 'linebreak'
            });
          }
          break;
        default:
          if (char !== ' ' && (lastChar === ' ' || lastChar === '\n') && lastTokenType() === 'linebreak') {
            if (!endToken()) {
              return;
            }
            if (lastTokenType() === 'linebreak') {
              removeLastToken();
              docBlockDepth = null;
              while (blockDepth > 0) {
                pushToken({
                  type: 'blockEnd'
                });
                blockDepth--;
              }
            } else if (docBlockDepth != null) {
              acc += char;
            }
          } else {
            acc += char;
          }
      }
      lastChar = char;
    }
    if ((docBlockDepth == null) && !docLine) {
      if (acc.length > 0 && acc[0] === '"') {
        acc += char;
        if (char === '"' && acc[acc.length - 2] !== '\\') {
          if (!endToken()) {
            return;
          }
        }
      } else {
        if (lastChar === ' ' && char !== ' ') {
          if (!endToken()) {
            return;
          }
        }
        switch (char) {
          case ' ':
            if (lastChar !== null && lastChar !== ' ') {
              if (!endToken()) {
                return;
              }
            }
            acc += char;
            break;
          case '(':
          case ')':
          case '[':
          case ']':
          case '{':
          case '}':
          case ',':
          case ':':
          case '?':
            if (!endToken()) {
              return;
            }
            pushToken({
              type: char
            });
            break;
          case '+':
          case '-':
          case '*':
          case '/':
            if (char === '-' && acc === '<') {
              acc += char;
              if (!endToken()) {
                return;
              }
            } else if (code.length < i + 1 || code[i + 1] !== '=') {
              if (!endToken()) {
                return;
              }
              pushToken({
                type: char
              });
            } else {
              acc += char;
            }
            break;
          case '=':
            acc += char;
            if (!endToken()) {
              return;
            }
            break;
          case '.':
            if (!integerRegex.test(acc)) {
              if (!endToken()) {
                return;
              }
              pushToken({
                type: char
              });
            } else {
              acc += char;
            }
            break;
          case '"':
            if (acc.length > 0 && acc[0] !== '"') {
              if (!endToken()) {
                return;
              }
            }
            acc += char;
            break;
          case '\r':
            if (!endToken()) {
              return;
            }
            break;
          case '\n':
            if (!endToken()) {
              return;
            }
            if (lastTokenType() !== 'linebreak') {
              pushToken({
                type: 'linebreak'
              });
            }
            break;
          default:
            if (lastChar === ' ' || (acc === '-' && validIdentifierRegex.test(char))) {
              if (!endToken()) {
                return;
              }
            }
            acc += char;
        }
      }
    }
    lastChar = char;
    if (char === '\n') {
      location.line++;
      location.column = 0;
    } else {
      location.column++;
    }
    if (acc.length === 0) {
      updateTokenStartLocation();
    }
  }
  if (!endToken()) {
    return;
  }
  while (lastTokenType() === 'linebreak') {
    removeLastToken();
  }
  while (blockDepth > 0) {
    pushToken({
      type: 'blockEnd'
    });
    blockDepth--;
  }
  return callback(null, tokens);
};



},{}]},{},[1])(1)
});

'use strict';
// Karma configuration
// Generated on Mon Sep 23 2013 22:15:35 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve all patterns, eg. files, exclude
    basePath: '',

    // frameworks to use
    frameworks: ['mocha', 'fixture'],

    // list of files / patterns to load in the browser
    files: [
      'public/javascripts/vendor.js',
      'public/javascripts/app.js',
      'test/*.test.js',
      {
        pattern: 'test/fixtures/**/*'
      }
    ],
    
    preprocessors: {
      '**/*.html'   : ['html2js']
    },

    // list of files to exclude
    exclude: [    ],

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['Chrome', 'Firefox', 'Opera', 'PhantomJS'],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};


exports.config =
  paths:
    watched: ['app', 'test', 'libs']
  files:
    javascripts:
      joinTo:
        'javascripts/app.js': /^app/
        'javascripts/vendor.js': (path) ->
           /^libs\/.*\.min\.js$/.test(path)
        'javascripts/test-vendor.js': (path) ->
           /^libs\/.*(chai\.js|chai-dom\.js)$/.test(path)
      order:
        before: [
          'libs/chai/chai.js'
        ]
    stylesheets:
      joinTo: 'app.css'
    templates:
      joinTo: 'app.js'
  ###
    Strange stuff needs strange configurations.
    By default brunch doesn't compile bower devDependencies but it compiles dependencies.
    jQuery and lodash are not project dependencies but are used for development.
    So it is needed to include them in `vendor.js` manually, choosing only dist files and
    include them without wrapping.
  ###
  conventions:
    ignored: (path) ->
      /^libs/.test(path) and not /^libs\/.*\.min\.js$/.test(path) and not /^libs\/.*(chai\.js|chai-dom\.js)$/.test(path)
 
  modules:
    wrapper: (path, data) ->
      return "#{data}" if /libs/i.test(path)
      moduleName = exports.config.modules.nameCleaner(path.replace(new RegExp('\\\\', 'g'), '/')).replace(/\.\w+$/, '')
      'require.register("' + moduleName + '", function(exports, require, module) {\n' + data + '\n});\n\n'

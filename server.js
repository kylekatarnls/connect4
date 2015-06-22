'use strict';

var http = require('./lib/http-plus');
var fs = require('fs');
var less = require('less');
var uglifyjs = require('uglify-js');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;

String.prototype.read = function (done) {
  fs.readFile(__dirname + '/' + this, "utf8", function (err, contents) {
    if(err) {
      console.warn(err);
    }
    done(contents);
  });
};

var cache = {};

var server = http.createServer(module.exports = function (request, response) {
  var jsFiles;
  switch(request.url) {
    case '/connect4.css':
      if(cache[request.url]) {
        response.css(cache[request.url]);
      } else {
        "./css/connect4.less".read(function (data) {
          less.render(data, {
            paths: ['./css'],
            filename: 'connect4.less',
            compress: true
          }, function (err, output) {
            if(err) {
              console.warn(err);
            } else {
              response.css(cache[request.url] = output.css);
            }
          });
        });
      }
      break;
    case '/connect4.js':
      jsFiles = ['./js/connect4.js', './js/multiplayer.js'];
      // Toggle a slash to disable/enable minficiation on the main script
      /*
      './js/connect4.js'.read(function (connect4) {
        './js/multiplayer.js'.read(function (multiplayer) {
          response.js(connect4 + multiplayer);
        });
      });
      break;
      //*/
    case '/js/winner-watch.js':
      if(cache[request.url]) {
        response.js(cache[request.url]);
      } else {
        var result = uglifyjs.minify(jsFiles || [ '.' + request.url ]);
        response.js(cache[request.url] = result.code);
      }
      break;
    default:
      var path = request.url
        .replace(/^([a-z]+)?:?\/\/[^\/]+/g, '')
        .replace(/[\\\s]/g, '') // forbidden chars in URL
        .replace(/\/\./g); // /. is forbidden as it could used to go outside the allowed folder
      if(path === '/') {
        path = '/index';
      }
      var controller = './controller' + path;
      var view = './view' + path + '.html';
      fs.exists(__dirname + '/' + controller + '.js', function (exists) {
        if(exists) {
          var next = response.json.bind(response);
          var form = new formidable.IncomingForm();
          form.parse(request, function (err, fields, files) {
            if(err) {
              response.error(err);
            } else {
              if(fields._method) {
                request.method = fields._method;
                delete fields._method;
              }
              request.fields = fields;
              request.files = files;
              require(controller)(request, response, next);
            }
          });
        } else {
          response.view(view);
        }
      });
  }
});

var port = process.env.PORT || 8000;

MongoClient.connect('mongodb://127.0.0.1:27017/Connect4-174855', function(err, db) {
  if(err) {
    throw err;
  }
  process.on('uncaughtException', function (err) {
    console.warn(err.stack || err);
  });
  global.db = db;
  if(! module.parent) {
    server.listen(port);
  }
  console.log('Listen on http://localhost:' + port);
  function cleanup() {
    db.close();
  }
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
});

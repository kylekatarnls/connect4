'use strict';

var http = require('http');
var fs = require('fs');
var extend = require('extend');

function send(status, type, content, store) {
  if(store) {
    this.setHeader('Cache-Control', 'public, max-age=34560000');
    this.setHeader('Expires', new Date(Date.now() + 34560000000).toUTCString());
  }
  this.writeHead(status, { "Content-Type": type + '; charset=utf-8' });
  this.end(content);
}

function _send(response, status, type, content, store) {
  send.call(response, status, type, content, store);
}

extend(http.ServerResponse.prototype, {
  send: send,
  css: function (css) {
    _send(this, 200, 'text/css', css, true);
  },
  js: function (js) {
    _send(this, 200, 'text/javascript', js, true);
  },
  html: function (html, status) {
    html = html.replace(/[\t\n\r]/g, ''); // Minify the HTML
    _send(this, status || 200, 'text/html', html, true);
    // My HTML is static, all my logic is in my JSON API
    // I can serve it as an asset even if most browsers
    // will force the reload
  },
  json: function (data, status) {
    _send(this, status || 200, 'application/json', JSON.stringify(data));
  },
  error: function (data, status) {
    _send(this, status || 500, 'text/plain', '' + data);
  },
  view: function (view) {
    var next = this.html.bind(this);
    fs.exists(__dirname + '/../' + view, function (exists) {
      (exists ? view : './view/error.html').read(next);
    });
  }
});

module.exports = http;

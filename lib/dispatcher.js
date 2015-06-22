'use strict';

var events = {};
var links = {};
var ObjectId = require('mongodb').ObjectID;
var linkName = null;

module.exports = {
  link: function (name) {
    if(name) {
      linkName = name;
      return this;
    } else {
      var ids = links[linkName].slice();
      delete links[linkName];
      linkName = null;
      return ids;
    }
  },
  clear: function (callbackIds) {
    if(! callbackIds instanceof Array) {
      callbackIds = links[callbackIds];
    }
    for(var event in events) {
      for(var id in events[event]) {
        if(~callbackIds.indexOf(id)) {
          delete events[event][id];
        }
      }
    }
    return this;
  },
  on: function (event, callback) {
    events[event] = events[event] || {};
    var id = (new ObjectId()).toString();
    events[event][id] = callback;
    if(linkName) {
      links[linkName] = links[linkName] || [];
      links[linkName].push(id);
    }
    return this;
  },
  trigger: function (event, params) {
    if(events[event]) {
      for(var id in events[event]) {
        events[event][id].apply(null, params);
      }
      delete events[event];
    }
    return this;
  }
};

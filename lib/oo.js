'use strict';

/*
 * Oriented object utils in a ECMAScript 6 style (see TypeScript or CoffeeScript).
 */

var extend = require('extend');

var oo = {
  abstract: function (name, methods) {
    var AbstractClass = function () {
      if(this.constructor.name === name) {
        throw new Error('Model is an abstract class');
      }
      if(this.constructor.__construct__) {
        this.constructor.__construct__.call(this, arguments);
      }
    };
    methods = methods || {};
    methods.extend = methods.extend || this._extend.bind(this, AbstractClass);
    this.methods(AbstractClass, methods);
    return AbstractClass;
  },
  methods: function (child, methods) {
    if(methods) {
      for(var key in methods) {
        if(methods.hasOwnProperty(key)) {
          if(key === 'prototype') {
            extend(child[key], methods[key]);
          } else {
            child[key] = methods[key];
          }
        }
      }
    }
  },
  _extend: function (parent, child, methods) {
    this.extend(child, parent, methods);
  },
  extend: function (child, parent, methods) {
    child.__super__ = parent;
    child.prototype.__super__ = parent.prototype;
    child.prototype.construt = function (params) {
      parent.__construct__.apply(this, params);
    };
    extend(child, parent);
    extend(child.prototype, parent.prototype);
    this.methods(child, methods);
  },
  _deepExtendVal: function (val) {
    return (typeof(val) === 'object' && val !== null) ?
      oo.deepExtend(val instanceof Array ? [] : {}, val):
      val;
  },
  deepExtend: function (to, from) {
    if(to instanceof Array) {
      to = from.slice().map(oo._deepExtendVal);
    } else {
      for(var key in from) {
        if(from.hasOwnProperty(key)) {
          to[key] = oo._deepExtendVal(from[key]);
        }
      }
    }
    return to;
  }
};

module.exports = oo;

'use strict';

var oo = require('../lib/oo');
var extend = require('extend');
var ObjectId = require('mongodb').ObjectID;

var Model = oo.abstract('Model', {
  remove:  function (data, done) {
    this.collection.remove(data, done);
  },
  create: function (data, done) {
    (new this(data)).save(done);
  },
  find: function (data, done) {
    var Model = this;
    Model.collection.find(data).toArray(function (err, arr) {
      if(arr) {
        arr = arr.map(function (data) {
          return new Model(data, data);
        });
      }
      done(err, arr);
    });
  },
  in: function (ids, done) {
    this.find({ _id: { $in: ids.map(function (id) {
      return new ObjectId(id);
    }) }}, done);
  },
  all: function (done) {
    this.find({}, done);
  },
  count: function (query, done) {
    if(typeof(query) === 'function') {
      done = query;
      query = {};
    }
    this.collection.find(query || {}).count(done);
  },
  findOne: function (query, done) {
    var Model = this;
    if(query.id) {
      query._id = new ObjectId(query.id);
      delete query.id;
    }
    Model.collection.findOne(query, function (err, model) {
      if(model) {
        model = new Model(model, model);
      }
      done(err, model);
    });
  },
  findById: function (id, done) {
    this.findOne({ _id: new ObjectId(id) }, done);
  },
  findByName: function (name, done) {
    this.findOne({ name: name }, done);
  },
  findOrCreate: function (data, done) {
    var Model = this;
    Model.findOne(data, function (err, model) {
      if(model) {
        done(null, model);
      } else {
        Model.create(data, done);
      }
    });
  },
  findOrNew: function (data, done) {
    var Model = this;
    Model.findOne(data, function (err, model) {
      done(model || extend(new Model(), data));
    });
  },
  __construct__: function (data, originalData) {
    this._originalData = oo.deepExtend({}, originalData);
    if(data) {
      extend(this, data);
    }
  },
  prototype:{
    remove: function (done) {
      this.constructor.collection.remove({ _id: new ObjectId(this._id || this.id) }, done);
    },
    save: function (done) {
      var originalData = this._originalData;
      var data = extend({}, this);
      delete data._originalData;
      for(var key in data) {
        if(JSON.stringify(data[key]) === JSON.stringify(originalData[key])) {
          delete data[key];
        }
      }
      if(this._id) {
        this.constructor.collection.update({ _id: new ObjectId(this._id || this.id) }, { $set: data }, done);
      } else {
        this.constructor.collection.insert([data], done);
      }
    }
  }
});

module.exports = Model;

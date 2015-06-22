'use strict';

var Model = require('./Model');
var extend = require('extend');
// We use bcrypt because any other hash (sha1, 2, etc., md5) is to easy to crack
var bcrypt = require('bcrypt-nodejs');
var ObjectId = require('mongodb').ObjectID;

function User() {
  this.construt(arguments);
}

Model.extend(User, {
  collection: db.collection('users'),
  generateToken: function (length) {
    var token = '';
    for(var i = length || 64; i > 0; --i) {
      token += String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }
    return token;
  },
  isValidToken: function (id, token, done) {
    this.authUser(id, token, function (err, user) {
      done(err, !! user);
    });
  },
  authUser: function (id, token, done) {
    if(! id instanceof ObjectId) {
      id = new ObjectId(id);
    }
    this.findById(id, function (err, user) {
      if(user) {
        if(user.token === token) {
          done(err, user);
        } else {
          done(err);
        }
      } else {
        done(err);
      }
    });
  },
  prototype: {
    testPassword: function (password, done) {
      bcrypt.compare(password, this.password, done);
    },
    mainProperties: function () {
      return {
        _id: this._id,
        name: this.name,
        token: this.token,
        victories: this.victories || 0,
        defeats: this.defeats || 0,
        roundsToWin: this.roundsToWin || 0,
        roundsToLoose: this.roundsToLoose || 0
      };
    },
    save: function (done) {
      var next = Model.prototype.save.bind(this, done);
      var data = extend({}, this);
      if(data.password) {
        bcrypt.hash(data.password, null, null, function(err, hash) {
          if(err) {
            done(err);
          } else {
            data.password = hash;
            next();
          }
        });
      } else {
        next();
      }
    }
  }
});

module.exports = User;

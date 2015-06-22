'use strict';

var User = require('../model/User');
var ObjectId = require('mongodb').ObjectID;
var dispatcher = require('../lib/dispatcher');

module.exports = function (request, response, next) {
  var userId = request.fields.author;
  User.authUser(userId, request.fields.token, function (err, user) {
    if(user) {
      dispatcher.trigger('chat', ['' + user._id, {
        author: user.name,
        date: new Date(),
        content: request.fields.message
      }]);
    } else {
      response.error("Please log in.");
    }
  });
};

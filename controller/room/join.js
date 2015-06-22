'use strict';

var Room = require('../../model/Room');
var User = require('../../model/User');
var ObjectId = require('mongodb').ObjectID;
var dispatcher = require('../../lib/dispatcher');

module.exports = function (request, response, next) {
  var userId = request.fields.roomOwner;
  var data = { user: new ObjectId(userId) };
  User.isValidToken(request.fields.newUser, request.fields.token, function (err, isValid) {
    if(isValid) {
      Room.findOne(data, function (err, room) {
        if(err) {
          response.error(err);
        } else if(~room.users.indexOf(request.fields.newUser)) {
          next({});
        } else {
          room.users.push(request.fields.newUser);
          if(room.users.length === 2) {
            room.currentPlayer = (Math.random() * 2) | 0;
          }
          room.save(function (err, result) {
            if(! err && result.result.ok) {
              User.in(room.users, function (err, users) {
                dispatcher.trigger('roomchange', [room, err ? [] : users.map(function (user) {
                  delete user.password;
                  delete user._originalData;
                  return user;
                })]);
              });
              next({ room: room });
            }
          });
        }
      });
    } else {
      response.error("Please log in.");
    }
  });
};

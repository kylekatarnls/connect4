'use strict';

var dispatcher = require('../lib/dispatcher');
var User = require('../model/User');

module.exports = function (request, response, done) {
  var userId = request.fields._id || '';
  var lastCheck = request.fields.lastCheck || 0;
  User.isValidToken(userId, request.fields.token, function (err, isValid) {
    if(isValid) {
      var timeout = null;
      var allData = {};
      var next = function (data) {
        dispatcher.clear(possibleEvents);
        if(timeout) {
          clearTimeout(timeout);
        }
        for(var key in data) {
          if(data.hasOwnProperty(key)) {
            allData[key] = data[key];
          }
        }
        timeout = setTimeout(function () {
          done(allData);
        }, 500);
      };
      var possibleEvents = dispatcher
        .link('possibleEvents')
        .on('roomschange', function (rooms) {
          next({ roomschange: [rooms.filter(function (room) {
            delete room._originalData;
            return request.fields._id !== '' + room.user;
          })] });
        })
        .on('roomchange', function (room, _users) {
          if(~room.users.indexOf(userId)) {
            var users = [];
            room.users.forEach(function (userId) {
              _users.forEach(function (user) {
                if(user._id + '' === userId) {
                  users.push(user);
                }
              });
            });
            next({ roomchange: [room, users] });
          }
        })
        .on('token', function (room, player, column) {
          if(player !== userId && ~room.users.indexOf(userId)) {
            next({ token: [room, column] });
          } else {
            next({});
          }
        })
        .on('win', function (rounds, user) {
          if(user._id + '' === userId) {
            next({ win: [user.victories, user.roundsToWin] });
          }
        })
        .on('loose', function (rounds, user) {
          if(user._id + '' === userId) {
            next({ loose: [user.defeats, user.roundsToLoose] });
          }
        })
        .on('chat', function (authorId, message) {
          if(authorId !== userId) {
            next({ chat: [message] });
          }
        })
        .link();
    } else {
      response.error("Please log in.");
    }
  });
};

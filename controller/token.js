'use strict';

var dispatcher = require('../lib/dispatcher');
var User = require('../model/User');
var Room = require('../model/Room');

module.exports = function (request, response, next) {
  var userId = request.fields._id || '';
  User.isValidToken(userId, request.fields.token, function (err, isValid) {
    if(isValid) {
      Room.findById(request.fields.room, function (err, room) {
        var playerPosition = room.users.indexOf(userId);
        if(room && ~playerPosition) {
          if(playerPosition === room.currentPlayer) {
            room.currentPlayer++;
            room.currentPlayer %= room.users.length;
            room.addToken(request.fields.column, userId);
            room.save(function () {
              dispatcher.trigger('token', [room, userId, request.fields.column]);
            });
            next({});
          } else {
            response.error("Wait for your turn.");
          }
        } else {
          response.error("Wrong room.");
        }
      });
    } else {
      response.error("Please log in.");
    }
  });
};

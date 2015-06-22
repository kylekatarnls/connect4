'use strict';

var Room = require('../model/Room');
var ObjectId = require('mongodb').ObjectID;
var dispatcher = require('../lib/dispatcher');

function dispatchRooms() {
  Room.all(function (err, rooms) {
    if(rooms) {
      dispatcher.trigger('roomschange', [rooms]);
    }
  });
}

module.exports = function (request, response, next) {
  var userId = request.fields._id || '';
  var data = { user: new ObjectId(userId) };
  switch(request.method) {
    case 'POST':
      Room.findOrNew(data, function (room) {
        room.name = request.fields.roomName;
        room.columns = request.fields.columns | 0;
        room.rows = request.fields.rows | 0;
        room.users = [userId];
        room.save(function (err, room) {
          if(err) {
            response.error(err);
          } else {
            dispatchRooms();
            next(room);
          }
        });
      });
      break;
    case 'DELETE':
      Room.remove(data, function (err, result) {
        if(err) {
          response.error(err);
        } else {
          dispatchRooms();
          next(result);
        }
      });
      break;
  }
};

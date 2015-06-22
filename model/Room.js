'use strict';

var Model = require('./Model');
var User = require('./User');
var dispatcher = require('../lib/dispatcher');
var getWinner = require('../js/winner-watch');
var alignToWin = 4;

function Room() {
  this.construt(arguments);
}

Model.extend(Room, {
  collection: db.collection('rooms'),
  prototype: {
    addToken: function (column, userId) {
      column |= 0; // Force integer type
      userId += ''; // Force string type
      this.grid = this.grid || [];
      var grid = this.grid;
      for(var y = 0; y < this.rows; y++) {
        if(! grid[y * this.rows + column]) {
          break;
        }
      }
      if(y < this.rows) {
        grid[y * this.rows + column] = userId;
        var winner = getWinner(grid, this.columns, this.rows, alignToWin);
        if(winner) {
          var winnerUserId = winner[0];
          this.users.forEach(function (userId) {
            var rounds = grid.filter(function (_userId) {
              return userId === _userId;
            }).length;
            var isTheWinner = (winnerUserId === userId);
            User.findById(userId, function (err, user) {
              if(user) {
                if(isTheWinner) {
                  user.roundsToWinList = user.roundsToWinList || [];
                  user.roundsToWinList.push(rounds);
                  var sum = 0;
                  user.roundsToWinList.forEach(function (_rounds) {
                    sum += _rounds;
                  });
                  user.roundsToWin = sum / user.roundsToWinList.length;
                  user.victories = (user.victories | 0) + 1;
                  dispatcher.trigger('win', [rounds, user]);
                } else {
                  user.roundsToLooseList = user.roundsToLooseList || [];
                  user.roundsToLooseList.push(rounds);
                  var sum = 0;
                  user.roundsToLooseList.forEach(function (_rounds) {
                    sum += _rounds;
                  });
                  user.roundsToLoose = sum / user.roundsToLooseList.length;
                  user.defeats = (user.defeats | 0) + 1;
                  dispatcher.trigger('loose', [rounds, user]);
                }
                user.save(function () {});
              }
            });
          });
        }
      }
    },
    save: function (done) {
      this.lastActivity = new Date();
      Model.prototype.save.call(this, done);
      // Destroy if inactive for 30 seconds
      setTimeout(function () {
        Room.findOne({ user: this.user }, function (err, room) {
          if(room && room.lastActivity.getTime() === requestTime.getTime()) {
            room.remove();
          }
        });
      }, 30 * 1000);
    }
  }
});

module.exports = Room;

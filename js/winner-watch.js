'use strict';

(function () {

  function getWinner(grid, columns, rows, alignToWin) {
    // N-S
    for(var x = 0; x < columns; x++) {
      for(var y = 0; y < rows - alignToWin + 1; y++) {
        var col = grid[y * rows + x] || false;
        if(col) {
          for(var i = 0; i < alignToWin; i++) {
            var c = grid[(y + i) * rows + x] || false;
            if(col !== c) {
              col = false;
              break;
            }
          }
          if(col) {
            return [col, 'N-S', x, y];
          }
        }
      }
    }
    // E-W
    for(var x = 0; x < columns - alignToWin + 1; x++) {
      for(var y = 0; y < rows; y++) {
        var col = grid[y * rows + x] || false;
        if(col) {
          for(var i = 0; i < alignToWin; i++) {
            var c = grid[y * rows + (x + i)] || false;
            if(col !== c) {
              col = false;
              break;
            }
          }
          if(col) {
            return [col, 'E-W', x, y];
          }
        }
      }
    }
    // NE-SW
    for(var x = 0; x < columns - alignToWin + 1; x++) {
      for(var y = 0; y < rows - alignToWin + 1; y++) {
        var col = grid[y * rows + x] || false;
        if(col) {
          for(var i = 0; i < alignToWin; i++) {
            var c = grid[(y + i) * rows + (x + i)] || false;
            if(col !== c) {
              col = false;
              break;
            }
          }
          if(col) {
            return [col, 'NE-SW', x, y];
          }
        }
      }
    }
    // NW-SE
    for(var x = alignToWin - 1; x < columns; x++) {
      for(var y = 0; y < rows - alignToWin + 1; y++) {
        var col = grid[y * rows + x] || false;
        if(col) {
          for(var i = 0; i < alignToWin; i++) {
            var c = grid[(y + i) * rows + (x - i)] || false;
            if(col !== c) {
              col = false;
              break;
            }
          }
          if(col) {
            return [col, 'NW-SE', x, y];
          }
        }
      }
    }
    return null;
  }

  try {
    // Front-end: JS client-side
    var checkForVictory = function (grid, columns, rows, alignToWin) {
      postMessage(getWinner(grid, columns, rows, alignToWin));
    };

    onmessage = function (event) {
      if(event.data) {
        checkForVictory(event.data[0], event.data[1], event.data[2], event.data[3]);
      }
    };
  } catch(e) {
    // Back-end: Node.js server-side
    module.exports = getWinner;
  }

}).call(this);

'use strict';

(function () {

  // settings
  var alignToWin = 4;
  var columnWidth = 60;
  var tokenWidth = columnWidth - 10;
  var gridStroke = "#b7b7b7";
  var tokenStroke = "#cfcfcf";

  // to quickly select one or many DOM elements
  window.$ = document.querySelector.bind(document);
  window.$$ = document.querySelectorAll.bind(document);

  // true when no player can add a token
  var locked = false;
  // lock for multiplayer games
  var remoteLocked = false;

  // better tiemout to get fluid animations
  var requestAnimFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      setTimeout(callback, 1000 / 60);
    };

  // Token model
  function Token(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  Token.prototype.register = function (grid, rows) {
    grid[this.y * rows + this.x] = this.color;
  };

  // extend prototype of a class with an object of methods
  window.extend = function (dest, src) {
    for(var i in src) {
      dest.prototype[i] = src[i];
    }
  };

  // to bind event easier (in a jQuery way)
  Object.prototype.on = function(sel, evt, fct) {
    // 3 arguments
    if(fct) {
      // attach living event (to current and future elements that match and will match the selector)
      this.on(evt, function (e) {
        var target = e.target || e.srcElement;
        var elements = $$(sel, this);
        for(var target = e.target || e.srcElement; target && target !== this && target !== document; target = target.parentNode) {
          if(~elements.indexOf(target)) {
            fct.call(target, e);
          }
        }
      });
    // 2 arguments
    } else {
      // attach primary event
      fct = evt;
      evt = sel;
      this.addEventListener ?
        this.addEventListener(evt, fct, false) :
        (this.attachEvent ?
          this.attachEvent('on' + evt, fct) :
          (this['on' + evt] = fct));
    }
    return this;
  };

  Event.prototype.cancel = function() {
    this.preventDefault();
    this.stopPropagation();
    return false;
  };

  extend(NodeList, {
    each: function(fct) {
      Array.prototype.forEach.call(this, function (elt, i) {
        fct.call(elt, i, elt);
      });
      return this;
    },
    map: function (fct) {
      var result = [];
      this.each(function (i) {
        result.push(fct.call(this, i, this));
      });
      return result;
    },
    indexOf: function () {
      return Array.prototype.indexOf.apply(this, arguments);
    }
  });

  Array.prototype.each = NodeList.prototype.each;

  extend(HTMLElement, {
    '$': function() {
      return this.querySelector.apply(this, arguments);
    },
    '$$': function() {
      return this.querySelectorAll.apply(this, arguments);
    },
    remove: function() {
      this.parentNode.removeChild(this);
    },
    html: function() {
      return arguments.length ?
        (this.innerHTML = arguments[0], this):
        this.innerHTML;
    },
    data: function() {
      if(arguments.length < 2) {
        var val = this.getAttribute('data-' + arguments[0]);
        if(val && typeof(val) === 'string') {
          return JSON.parse(val);
        }
        return val;
      }
      this.setAttribute('data-' + arguments[0], JSON.stringify(arguments[1]));
      return this;
    },
    height: function(height) {
      this.style.height = isNaN(height) ? height : height + 'px';
      return this;
    }
  });

  extend(HTMLCanvasElement, {
    withContext: function(fct) {
      var ctx = this.getContext("2d");
      fct.call(this, ctx);
      return this;
    },
    clear: function() {
      return this.withContext(function (ctx) {
        ctx.clearRect(0, 0, this.width, this.height);
      });
    },
    drawToken: function(y, strokeStyle, fillStyle) {
      return this.withContext(function (ctx) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(columnWidth / 2, y, tokenWidth / 2, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.stroke();
      });
    },
    drawGrid: function(y, strokeStyle, fillStyle) {
      return this.withContext(function (ctx) {
        for(var y = columnWidth / 2; y < this.height; y += columnWidth) {
          ctx.lineWidth = 6;
          ctx.strokeStyle = gridStroke;
          ctx.beginPath();
          ctx.arc(columnWidth / 2, y, columnWidth / 2, 0, Math.PI * 2, true);
          ctx.stroke();
          for(var corner = 0; corner < 4; corner ++) {
            for(var x = 4; x < columnWidth / 2; x += 4) {
              ctx.beginPath();
              ctx.arc(columnWidth / 2, y, columnWidth / 2 + x, Math.PI * (corner / 2 + 0.4 - x / 4 / columnWidth), Math.PI * (corner / 2 + 0.125 + x / 8 / columnWidth), true);
              ctx.stroke();
            }
          }
        }
      });
    },
    tokens: function () {
      return (this.data('tokens') || []).map(function (data, y) {
        return new Token(null, y, data[1]);
      });
    }
  });

  for(var fctName in HTMLElement.prototype) {
    NodeList.prototype[fctName] = Array.prototype[fctName] = (function(fctName) {
      return function() {
        var params = arguments;
        var list = this;
        var result = list;
        list.each(function () {
          var subResult = HTMLElement.prototype[fctName].apply(this, params);
          if(subResult !== this && result === list) {
            result = subResult;
          }
        });
        return result;
      };
    })(fctName);
  }

  var w = new Worker('js/winner-watch.js');
  var canvas, columns, rows;

  w.onmessage = function (event) {
    if(event.data) {
      var winner = event.data;
      for(var i = players.length - 1; i >= 0; i--) {
        if(players[i][1] === winner[0]) {
          logToHistory(alignToWin + ' tokens aligned in ' + winner[1] + ' direction starting from ' + (1 + winner[2]) + ';' + (rows - winner[3]));
          logToHistory(players[i][0] + ' wins!');
          return;
        }
      }
    } else {
      locked = false;
      nextPlayer();
    }
  };

  function checkForVictory() {
    var grid = [];
    canvas = $$('#grid canvas');
    columns = canvas.length;
    rows = canvas[0].height / canvas[0].width;
    canvas.each(function (x) {
      this.tokens().each(function () {
        this.x = x;
        this.register(grid, rows);
      });
    });
    w.postMessage([grid, columns, rows, alignToWin]);
  }

  var currentPlayer;

  function notEnoughPlayers() {
    alert('Please add at least two players');
  }

  var $settings = $('#settings');

  function getGridSize() {
    var size = $settings.$$('input[type="number"]').map(function () {
      return this.value;
    });
    return {
      columns: size[0] | 0,
      rows: size[1] | 0
    };
  }

  function startGame(settings) {
    locked = false;
    remoteLocked = false;
    currentPlayer = (settings.currentPlayer | 0) - 1;
    var width = settings.columns;
    var height = settings.rows;
    var gridHeight = columnWidth * height;
    var grid = '';
    for(var x = 0; x < width; x++) {
      grid += '<canvas width="' + columnWidth + '" height="' + gridHeight + '"></canvas>';
    }
    $('#grid').height(gridHeight).html(grid).$$('canvas').each(function () {
      this.drawGrid();
    });
    logToHistory('A new game begin.');
    nextPlayer();
  }

  $settings.on('submit', function (e) {
    if(players.length > 1) {
      startGame(getGridSize());
    } else {
      notEnoughPlayers();
    }
    return e.cancel();
  });

  var players = [];

  function randomColor() {
    var col;
    do {
      col = '';
      for(var i = 0; i < 6; i++) {
        col += Math.floor(Math.random() * 16).toString(16);
      }
    } while(~players.map(function (params) {
      return params[1];
    } ).indexOf(col));
    return col;
  }

  function addPlayer(playerName, color) {
    color = color || '#' + randomColor();
    logToHistory(playerName + ' enter the game.');
    players.push([playerName, color]);
    var player = '<div class="player"><input type="button" class="delete" value="Delete"><span class="token" style="background: ' + color + '"></span>' + playerName.replace(/</g, '&lt;') + '</div>';
    $('#players').html($('#players').html() + player);
  }

  $('#add-player').on('submit', function (e) {
    var values = this.$$('input').map(function () {
      return this.value;
    });
    var playerName = values[0];
    var color = values[1];
    for(var i = players.length - 1; i >= 0; i--) {
      if(players[i][1] === color) {
        alert('Color already token.');
        return e.cancel();
      }
    }
    addPlayer(playerName, color);
    this.$('input[type="color"]').value = '#' + randomColor();
    var playerNameInput = this.$('input[type="text"]');
    playerNameInput.value = '';
    playerNameInput.focus();
    return e.cancel();
  });

  $('#players').on('.delete', 'click', function () {
    var player = this.parentNode;
    var index = $$('#players .player').indexOf(player);
    logToHistory(players[index][0] + ' leave the game.');
    players.splice(index, 1);
    player.remove();
  });

  function columnClick(columnElement) {
    var column = parseInt(columnElement);
    if(isNaN(column)) {
      column = $$('#grid canvas').indexOf(columnElement);
    } else {
      columnElement = $$('#grid canvas')[column];
    }
    var fillStyle = players[currentPlayer][1];
    var strokeStyle = tokenStroke;
    var rowCount = columnElement.height / columnWidth;
    var tokens = columnElement.data('tokens') || [];
    var tokenInThisColumn = tokens.length;
    if(tokenInThisColumn < rowCount) {
      locked = true;
      $('#layer .token').className = 'animated token';
      $('#layer .token').style.top = columnWidth + 'px';
      $('#next-player').html('');
      var newTokens = tokens.slice();
      newTokens.push([strokeStyle, fillStyle]);
      columnElement.data('tokens', newTokens);
      var finalRow = rowCount - tokenInThisColumn;
      var y = columnWidth / -2;

      var drawToken = (function () {
        y += columnWidth / 4;
        if(y > (finalRow - 0.5) * columnWidth) {
          checkForVictory();
        } else {
          var canvas = this.clear().drawToken(y, strokeStyle, fillStyle);
          tokens.each(function (i) {
            canvas.drawToken((rowCount - i - 0.5) * columnWidth, this[0], this[1]);
          });
          canvas.drawGrid();
          requestAnimFrame(drawToken);
        }
      }).bind(columnElement);

      drawToken();
    }
  }

  $('body').on('canvas', 'click', function () {
    if(! locked && ! remoteLocked) {
      if(players.length > 1) {
        columnClick(this);
      } else {
        notEnoughPlayers();
      }
    }
  });

  var startX = null;
  var startLeft = null;
  var startY = null;

  $('#layer .token').on('mousedown', function (e) {
    startX = e.pageX;
    startY = e.pageY;
    startLeft = parseInt($('#layer .token').style.left) | 0;
    return e.cancel();
  });

  window.on('mousemove', function (e) {
    if(startX !== null) {
      var columns = $$('#grid canvas').length;
      var pos = Math.max(0, Math.min(columns - 1, Math.round((e.pageX + startLeft + (columnWidth * (columns - 1) / 2) - startX) / columnWidth)));
      $('#layer .token').style.left = ((0.5 + pos - columns / 2) * columnWidth) + 'px';
      return e.cancel();
    }
  });

  window.on('mouseup', function (e) {
    if(startX !== null) {
      if(e.pageY - startY > columnWidth / 2) {
        var canvas = $$('#grid canvas');
        var columns = canvas.length;
        var pos = Math.max(0, Math.min(columns - 1, Math.round((e.pageX + (columnWidth * (columns - 1) / 2) - startX) / columnWidth)));
        canvas[pos].click();
      }
      startX = null;
      startLeft = null;
      startY = null;
      return e.cancel();
    }
  });

  localStorage = localStorage || {};

  function refreshHistory() {
    $('#history').html((localStorage.history || '').replace(/\n/g, '<br>')).scrollTop = 9999999;
  }

  function logToHistory(message) {
    var d = new Date();
    var min = d.getMinutes();
    localStorage.history = (localStorage.history || '') + d.getHours() + 'h' + (min < 10 ? '0' : '') + min + ': ' + message + '\n';
    refreshHistory();
  }

  refreshHistory();

  function nextPlayer() {
    currentPlayer = (currentPlayer + 1) % players.length;
    var columns = $$('#grid canvas').length;
    var token = $('#layer .token');
    token.className = 'token';
    token.style.top = '0px';
    token.style.left = ((1 - columns % 2) * columnWidth / -2) + 'px';
    token.style.background = players[currentPlayer][1];
    $('#next-player').html('Next player: ' + players[currentPlayer][0]);
  }

  this.connect4 = {
    columnClick: columnClick,
    getGridSize: getGridSize,
    startGame: startGame,
    remoteLock: function (locked) {
      remoteLocked = !! locked;
    },
    setPlayers: function (_players) {
      $('#players').html('');
      players = [];
      _players.forEach(function (player) {
        addPlayer(player.name);
      });
    }
  };

}).call(this);

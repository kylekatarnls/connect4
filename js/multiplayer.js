(function () {

  var connect4 = this.connect4;

  function each(obj, fct) {
    for(var key in obj) {
      if(obj.hasOwnProperty(key)) {
        fct.call(obj[key], key, obj[key], obj);
      }
    }
  }

  var AjaxHandler = function () {};
  ['complete', 'error', 'success'].each(function (i, method) {
    AjaxHandler.prototype[method] = function (fct) {
      this['_' + method] = fct;
      return this;
    };
  });
  AjaxHandler.prototype.triggerComplete = function (error, data) {
    if(this._complete) {
      this._complete(error, data);
    }
    if(error) {
      if(this._error) {
        this._error(data, error);
      }
    } else {
      if(this._success) {
        this._success(data);
      }
    }
  };

  var ajax = {
    send: function (method, url, data, sync) {
      var handler = new AjaxHandler();
      var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
      var body;
      if(method === 'GET') {
        body = [];
        each(data, function (key) {
          body.push(key + '=' + encodeURIComponent(this));
        });
        if(body.length) {
          url += '?' + body.join('&');
        }
        body = '';
      } else {
        body = new FormData();
        each(data, function (key) {
          body.append(key, this);
        });
      }
      xhr.open(method, url, ! sync);
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
          handler.triggerComplete.apply(handler,
            xhr.status === 200 || xhr.status === 0 ?
              [
                null,
                (xhr.getResponseHeader("Content-Type") || '').indexOf('application/json') === 0 ?
                  JSON.parse(xhr.responseText) :
                  xhr.responseText
              ] : [
                xhr.status,
                xhr.responseText
              ]
          );
        }
      };
      xhr.send(body);
      return handler;
    },
    get: function (url, data, success) {
      if(typeof(data) === 'function') {
        success = data;
        data = null;
      }
      return this.send('GET', url, data).success(success);
    },
    post: function (url, oData, success) {
      if(typeof(data) === 'function') {
        success = data;
        oData = null;
      }
      var data = null;
      if(oData) {
        data = {};
        each(oData, function (key) {
          data[key] = this;
        });
      }
      return this.send('POST', url, data).success(success);
    },
    put: function (url, oData, success) {
      if(typeof(data) === 'function') {
        success = data;
        oData = {};
      }
      var data = { _method: 'PUT' };
      each(oData, function (key) {
        data[key] = this;
      });
      return this.post(url, data, success);
    },
    delete: function (url, oData, success) {
      if(typeof(data) === 'function') {
        success = oData;
        oData = {};
      }
      var data = { _method: 'DELETE' };
      each(oData, function (key) {
        data[key] = this;
      });
      return this.post(url, data, success);
    }
  };

  var cookie = {
    set: function (name, value, days) {
      if(days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
      }
      else var expires = "";
      document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    },
    get: function (name) {
      var needle = name + "=";
      var ca = document.cookie.split(';');
      for(var i = 0; i < ca.length; i++) {
          var c = ca[i];
          while(c.charAt(0) === ' ') {
            c = c.substr(1);
          }
          if(c.indexOf(needle) === 0) {
            return decodeURIComponent(c.substr(needle.length));
          }
      }
      return "";
    },
    remove: function (name) {
      this.set(name, '', -1);
    }
  };

  var dispatcher = (function () {
    var events = {};
    return {
      trigger: function (event, params) {
        if(events[event]) {
          events[event].each(function () {
            this.apply(null, params);
          });
        }
      },
      on: function (event, callback) {
        events[event] = events[event] || [];
        events[event].push(callback);
      }
    };
  })();

  // What about a bit of dynamic MVVM in a angularjs way
  var controllers = {
    auth: function () {
      var rooms = [];
      var session = {};
      var postGame = null;
      var watch;
      var logginSucceed = this.$bind(function (user) {
        this.loggedIn = true;
        this.user = user;
        this.roomName = user.name;
        this.rooms = rooms;
        session = user;
        var lastCheck = 0;
        watch = function () {
          var data = { lastCheck: lastCheck };
          each(session, function (key) {
            data[key] = this;
          });
          postGame = ajax.post('/game', data, function (triggers) {
            each(triggers, function (event) {
              dispatcher.trigger(event, this);
            });
            watch();
          });
          lastCheck = (new Date()).getTime();
        };
        watch();
        if(this.roomEnabled) {
          changeRoomName(this.roomName);
        } else {
          ajax.delete('room', session);
        }
        if(this.remember) {
          cookie.set('id', user._id, 60);
          cookie.set('token', user.token, 60);
        }
      });
      dispatcher.on('win', this.$bind(function (victories, roundsToWin) {
        this.user.victories = victories;
        this.user.roundsToWin = roundsToWin;
      }));
      dispatcher.on('loose', this.$bind(function (defeats, roundsToLoose) {
        this.user.defeats = defeats;
        this.user.roundsToLoose = roundsToLoose;
      }));
      var failure = function (method) {
        return this.$bind(function (error) {
          this[method + 'Error'] = error;
        })
      }.bind(this);
      var id = cookie.get('id');
      if(id) {
        ajax.post('user/remember', {
          id: id,
          token: cookie.get('token')
        }, logginSucceed);
      }
      this.logout = function () {
        this.loggedIn = false;
        cookie.remove('id');
        cookie.remove('token');
      };
      this.login = function () {
        this.loginError = null;
        ajax.post('user/login', {
          name: this.name,
          password: this.password
        })
        .success(logginSucceed)
        .error(failure('login'));
      };
      this.register = function () {
        this.registerError = (function () {
          var name = this.registerName;
          var password = this.registerPassword;
          var passwordConfirmation = this.registerPasswordConfirmation;
          if(password !== passwordConfirmation) {
            return "Both password are not the same.";
          }
          if(password.length < 4) {
            return "The password is too short.";
          }
          ajax.put('user', {
            name: name,
            password: password
          })
          .success(logginSucceed)
          .error(failure('register'));
        }).call(this);
      };
      this.chat = {
        sendMessage: function () {
          ajax.post('/chat', {
            message: this.newMessage.content,
            author: session._id,
            token: session.token
          });
          this.messages.push({
            author: session.name,
            date: new Date(),
            content: this.newMessage.content
          });
          this.newMessage.content = '';
        },
        newMessage: {
          content: ''
        },
        messages: []
      };
      dispatcher.on('chat', this.$bind(function (message) {
        message.date = new Date(message.date);
        this.chat.messages.push(message);
      }));
      this.number = function (number) {
        return number | 0;
      };
      this.join = function (room) {
        ajax.post('/room/join', {
          roomOwner: room.user,
          newUser: session._id,
          token: session.token
        }, this.$bind(function (game) {
          postGame.abort();
          watch();
        }));
      };
      this.roomEnabled = false;
      var changeRoomName = function (name) {
        if(this.roomEnabled) {
          var data = connect4.getGridSize();
          data.roomName = name;
          each(session, function (key) {
            data[key] = this;
          });
          ajax.post('room', data);
        }
      }.bind(this);
      var refreshRooms = function () {
        this.rooms = rooms.slice();
        if(this.roomEnabled) {
          this.rooms.push({ name: this.roomName });
          changeRoomName(this.roomName);
        } else if(session.id) {
          ajax.delete('room', session);
        }
      }.bind(this);
      dispatcher.on('roomschange', this.$bind(function (newRooms) {
        rooms = newRooms;
        refreshRooms();
      }));
      var room = {};
      var locked;
      function roomLock(room) {
        var myPosition = room.users.indexOf(session._id);
        locked = room.currentPlayer !== myPosition;
        connect4.remoteLock(locked);
      }
      dispatcher.on('token', this.$bind(function (_room, column) {
        room = _room;
        connect4.columnClick(column);
        roomLock(room);
      }));
      dispatcher.on('roomchange', this.$bind(function (_room, users) {
        room = _room;
        connect4.setPlayers(users);
        connect4.startGame(room);
        roomLock(room);
        $('body').on('canvas', 'click', function () {
          if(! locked) {
            locked = true;
            connect4.remoteLock(locked);
            var column = $$('#grid canvas').indexOf(this);
            ajax.put('/token', {
              column: column,
              _id: session._id,
              token: session.token,
              room: room._id
            });
          }
        });
      }));
      this.$watch('roomName', changeRoomName);
      this.$watch('roomEnabled', function (roomEnabled) {
        refreshRooms();
      });
    }
  };

  // Here is my mini MVVM framework
  function exec(scope, code) {
    try {
      return eval(code.replace(/[a-z$_][a-z0-9$\._]*/gi, function (varName, position) {
        var before = code.substr(0, position);
        if(! /\.\s*$/.test(before)) {
          before = before.replace(/"(.*?[^\\"])?(\\\\)*"/g, '').replace(/'(.*?[^\\'])?(\\\\)*'/g, '');
          if(! /['"]/.test(before)) {
            var firstPart = varName.split('.')[0];
            if(! ~['undefined', 'null', 'var', 'if', 'else', 'for', 'while', 'function', 'in', 'true', 'false', 'do', 'try', 'catch', 'Error', 'window'].indexOf(firstPart))
            return 'scope.' + varName;
          }
        }
        return varName;
      }));
    } catch(e) {
      if((e.message || '').indexOf('Cannot read property') !== 0) {
        console.warn(e);
      }
    }
  }

  function apply(scope, fct) {
    var self = this;
    if(fct) {
      fct.call(self);
    }
    var _exec = exec.bind(self, scope);
    self.$$('[repeated]').each(function () {
      this.parentNode.removeChild(this);
    });
    self.$$('[repeat]').each(function () {
      var template = this.data('repeatTemplate');
      if( ! template) {
        this.data('repeatTemplate', encodeURIComponent(this.innerHTML));
      }
    });
    var template;
    if(!self.data('template') && ~self.innerHTML.indexOf('{{')) {
      self.data('template', template = self.innerHTML);
    } else {
      template = self.data('template');
    }
    if(template) {
      template = template.replace(/\{\{(.*?)\}\}/g, function (all, expression) {
        var result = _exec(expression);
        return result == null || result == undefined ? '' : result;
      });
      if(template !== self.data('htmlState')) {
        self.innerHTML = template;
        self.data('htmlState', template);
      }
    }
    self.$$('[if]').each(function () {
      var condition = this.getAttribute('if');
      this.style.display = _exec(condition) ? '' : 'none';
    });
    ['click', 'submit'].each(function () {
      var event = this;
      self.$$('[' + event + ']').each(function () {
        var action = this.getAttribute(event);
        this.removeAttribute(event);
        this.on(event, function (e) {
          _exec(action);
          scope.$apply();
          e.preventDefault();
        })
      });
    });
    self.$$('[model]').each(function () {
      var model = this;
      var names = model.getAttribute('model').split('.');
      var name = names[0];
      var checkbox = model.type === 'checkbox';
      var varHandler = scope;
      for(var i = 1; i < names.length; i++) {
        varHandler[name] = varHandler[name] || {};
        varHandler = varHandler[name];
        name = names[i];
      }
      if(checkbox) {
        model.checked = !! varHandler[name];
      } else if(typeof(varHandler[name]) !== 'undefined' && varHandler[name] !== model.value) {
        model.value = varHandler[name];
      }
      if(! model.data('watched')) {
        model.data('watched', true);
        ['keydown', 'keyup', 'change', 'click', 'focus', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'dragend'].each(function () {
          model.on(this, function () {
            varHandler[name] = checkbox ? model.checked : model.value;
            scope.$apply();
          });
        });
      }
    });
    if(scope.$$watched) {
      each(scope.$$watched, function (varName) {
        var data = this;
        if(scope[varName] !== data.value) {
          data.fcts.each(function () {
            this.call(scope, scope[varName], data.value);
          });
          data.value = scope[varName];
        }
      });
    }
    self.$$('[data-repeatTemplate]').each(function () {
      var repeater = this;
      repeater.style.display = '';
      var template = decodeURIComponent(this.data('repeatTemplate'));
      this.innerHTML = template;
      var clone = this.cloneNode(true);
      clone.removeAttribute('data-repeatTemplate');
      clone.removeAttribute('repeat');
      clone.setAttribute('repeated', 'repeated');
      repeater.style.display = 'none';
      var params = repeater.getAttribute('repeat').split(/\s+in\s+/g);
      var varName, expression;
      if(params[1]) {
        varName = params[0];
        expression = params[1];
      } else {
        varName = 'item';
        expression = params[0];
      }
      var items = _exec(expression) || [];
      var append = (function (next, parent) {
        return next ? function (repeated) {
          parent.insertBefore(repeated, next);
        } : function (repeated) {
          parent.appendChild(repeated);
        };
      })(repeater.nextSibling, repeater.parentNode);
      items.each(function (i) {
        var repeated = clone.cloneNode(true);
        append(repeated);
        var _scope = createScope(repeated);
        _scope[varName] = this;
        _scope.$index = i;
        _scope.$parent = scope;
        _scope.$apply();
      });
    });
  }

  function bind(fct) {
    return function () {
      fct.apply(this, arguments);
      return this.$apply();
    }.bind(this);
  }

  function watch(varName, fct) {
    this.$$watched = this.$$watched || {};
    this.$$watched[varName] = this.$$watched[varName] || {
      value: this[varName] || null,
      fcts: []
    };
    this.$$watched[varName].fcts.push(fct);
  }

  function createScope(elt) {
    var scope = {};
    scope.$bind = bind.bind(scope);
    scope.$apply = apply.bind(elt, scope);
    scope.$watch = watch.bind(scope);
    return scope;
  }

  $$('[controller]').each(function () {
    var controller = this.getAttribute('controller');
    var scope = createScope(this);
    controllers[controller].call(scope);
    scope.$apply();
  });

  this.ajax = ajax;

}).call(this);

'use strict';

var User = require('../../model/User');

module.exports = function (request, response, next) {
  function fail() {
    response.error("Wrong credentials.");
  }
  User.findByName(request.fields.name, function (err, user) {
    if(err) {
      response.error(err);
    } else if(user) {
      user.testPassword(request.fields.password, function (err, match) {
        if(err) {
          response.error(err);
        } else if(match) {
          next(user.mainProperties());
        } else {
          fail();
        }
      });
    } else {
      fail();
    }
  });
};

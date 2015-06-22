'use strict';

var User = require('../../model/User');

module.exports = function (request, response, next) {
  User.findOne({
    id: request.fields.id,
    token: request.fields.token
  }, function (err, user) {
    if (err || ! user) {
      response.error("KO");
    } else {
      next(user.mainProperties());
    }
  });
};

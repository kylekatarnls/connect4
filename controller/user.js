'use strict';

var User = require('../model/User');

module.exports = function (request, response, next) {
  switch(request.method) {
    case 'PUT':
      User.count({
        name: request.fields.name
      }, function (err, count) {
        if(err || count) {
          response.error(err || "This name is not available.");
        } else {
          User.create({
            name: request.fields.name,
            password: request.fields.password,
            token: User.generateToken()
          }, function (err, result) {
            if(err || result.n < 1 || result.ops.length < 1) {
              response.error(err || "An error occured, please retry later.");
            } else {
              var user = result.ops[0];
              next({
                token: user.token,
                _id: user._id,
                name: user.name
              });
            }
          });
        }
      });
      break;
    case 'GET':
      User.all(function (err, users) {
        if(err) {
          response.error(err);
        } else {
          next({
            users: users
          });
        }
      });
      break;
  }
};

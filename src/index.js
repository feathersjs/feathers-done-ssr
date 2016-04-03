'use strict';

const jwt = require('jsonwebtoken');
const merge = require('lodash.merge');
const cookieParser = require('cookie-parser');
const cors = require('cors');

module.exports = function(app, config) {

  var defaults = {
    endpoint: '/ssr-cookie',
    name: 'ssr-cookie',
    cookie: {
      httpOnly: true
    },
  };
  config = merge(defaults, config);

  // Require same origin requests for the SSR site.
  app.use(cors({ origin: false }));
  app.use(cookieParser());

  /**
   * The `ssr-cookie` middleware receives a token in the POST body and sets up
   * that token in a cookie. The cookie will have the same expiration as that of
   * the token.
   */
  app.post(config.endpoint, function(req, res) {
    var token = req.body && req.body['ssr-token'];
    if (token) {
      jwt.verify(token, app.get('auth').token.secret, function(err, decoded) {
        if (err) {
          return res.status(400).send({
            message: 'Invalid token.',
            err
          });
        }
        config.cookie.expires = new Date(decoded.exp * 1000);
        delete config.cookie.maxAge;
        res.cookie(config.name, token, config.cookie);
        return res.status(200).send({
          message: 'success'
        });
      });

    // No `ssr-token` was received.
    } else {
      return res.status(400).send({
        message: 'Please include a valid token in the request body.'
      });
    }
  });

  /**
   * If an `ssr-cookie` (or config.name cookie) is received, take the token and
   * set it up in the Authoriation header.
   */
  return function(req, res, next) {
    let token = req.cookies[config.name];
    if (token) {
      req.headers.authorization = `Bearer ${token}`;
    }
    next();
  };
};

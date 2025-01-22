'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.findByUsername = exports.logout = exports.login = exports.register = void 0;
const bcrypt_1 = require('bcrypt');
const user_model_1 = require('./user.model');
const register = (req, res) => {
  const { username } = req.body;
  // Validate request
  if (!username || !req.body.password || !req.body.email) {
    res.status(400).send({
      message: 'Missing data!',
    });
    return;
  }
  user_model_1.User.findOne({ where: { username } })
    .then((foundUser) => {
      if (foundUser) {
        throw new Error('A use with this username already exists! Try to log in or chose another username.');
      }
    })
    .then(() => (0, bcrypt_1.hash)(req.body.password, 8))
    .then(
      (password) =>
        new user_model_1.User({
          username,
          password,
          email: req.body.email,
          isAdmin: req.body.isAdmin,
        }),
    )
    .then((user) => user.save())
    .then((savedUser) => {
      // authenticate the user
      req.session.user = savedUser;
      res.status(201).send();
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || 'Some error occurred while creating the user.',
      });
    });
};
exports.register = register;
const login = (req, res) => {
  // Validate request
  if (!req.body.email || !req.body.password) {
    res.status(400).send({
      message: 'Missing username or password!',
    });
    return;
  }
  user_model_1.User.findOne({ where: { email: req.body.email } })
    .then((user) => {
      if (!user) {
        throw new Error('User not found');
      }
      return user.comparePasswrod(req.body.password).then((isMatchingPassword) => ({
        user,
        isMatchingPassword,
      }));
    })
    .then(({ user, isMatchingPassword }) => {
      if (!isMatchingPassword) {
        throw new Error("Passwords don't match");
      }
      // authenticate the user
      req.session.user = user;
      res.status(200).send();
    })
    .catch(() => {
      res.status(401).send({
        message: 'Incorrect username or password!',
      });
    });
};
exports.login = login;
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).send({
        message: 'An error occured while trying to logout!',
      });
      return;
    }
    res.status(200).send();
  });
};
exports.logout = logout;
const findByUsername = (req, res) => {
  const { username } = req.params;
  // Validate request
  if (!username) {
    res.status(400).send({
      message: 'Missing username param!',
    });
    return;
  }
  user_model_1.User.findOne({ where: { username } })
    .then((user) => res.send(user))
    .catch(() => {
      res.status(500).send({
        message: `Error retrieving User with username=${username}`,
      });
    });
};
exports.findByUsername = findByUsername;
//# sourceMappingURL=user.controller.js.map

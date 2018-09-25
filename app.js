var express = require('express');
var assert = require('assert');

var passport = require('passport');
var passStrategyLocal = require('passport-local').Strategy;

var session = require('express-session');
var mongodbSessionStore = require('connect-mongodb-session')(session);

var mongoClient = require("mongodb").MongoClient
var mongodbUrl = "mongodb://127.0.0.1:27017"

// Create a new Express application.
var app = express();

var store = new mongodbSessionStore(
  {
    uri: mongodbUrl,
    databaseName: 'auth',
    collection: 'sessions'
  });

// Catch errors
store.on('error', function (error) {
  assert.ifError(error);
  assert.ok(false);
});

app.use(require('express-session')({
  secret: 'This is a secret',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));


app.use(require("body-parser").json())
app.use(require("body-parser").urlencoded({ extended: true }))
app.use(require("cors")())
app.use(require('morgan')('tiny'));
app.use("/login/bower_components", express.static(__dirname + "/public/bower_components"))

//==================================================================================================
// Local Passport
//==================================================================================================
// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new passStrategyLocal(function (username, password, cb) {
  mongoClient.connect(mongodbUrl + "/auth", function (err, client) {
    client.db("auth").collection("users").findOne({ username: username, password: password }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
      db.close();
    });
  });
}));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, cb) {
  cb(null, user.username);
});

passport.deserializeUser(function (username, cb) {
  mongoClient.connect(mongodbUrl, { useNewUrlParser: true }, function (err, client) {
    client.db("auth").collection("users").findOne({ username: username }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
      client.close();
    });
  });
});


// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res) {
  res.redirect(req.query.source);
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/login');
});


app.get('/user', function (req, res) {
  if (req.user) {
    mongoClient.connect(mongodbUrl, function (err, client) {
      client.db("auth").collection("users").findOne({ token: req.user.token }, function (err, user) {
        if (err) res.send(err)
        else res.send(user)
        client.close();
      });
    });
  }
  else res.send({})
});

app.listen(3007, function () {
  console.log("Service 3007-login running on http://127.0.0.1:3007")
})

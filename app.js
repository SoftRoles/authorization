var express = require('express');
var request = require('request');

var passport = require('passport');
var passStrategyLocal = require('passport-local').Strategy;

// Create a new Express application.
var app = express();

app.use(require("body-parser").json())
app.use(require("body-parser").urlencoded({ extended: true }))
app.use(require("cors")())
app.use(require('morgan')('tiny'));
app.use("/bower_components", express.static(__dirname + "/public/bower_components"))
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
  request({
    url: "http://127.0.0.1:3000/mongodb/api/auth/users?username=" + username + "&password=" + password,
    headers: { "Authorization": "Bearer %Sdf1234" }
  }, function (err, res, body) {
    var users = JSON.parse(body)
    if (err) return cb(err)
    if (!users.length) { return cb(null, false); }
    return cb(null, users[0]);
  })
}));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, cb) {
  // console.log("[3005-mongodb]: passport.serializeUser", user)
  cb(null, user.username);
});

passport.deserializeUser(function (username, cb) {
  request({
    url: "http://127.0.0.1:3000/mongodb/api/auth/users?username=" + username,
    headers: { "Authorization": "Bearer %Sdf1234" }
  }, function (err, res, body) {
    var users = JSON.parse(body)
    if (err) return cb(err)
    if (!users.length) { return cb(null, false); }
    return cb(null, users[0]);
  })
});


// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res) {
  // res.set({"Authorization": "Bearer " + req.user.token})
  // res.header("Authorization", "Bearer " + req.user.token)
  res.redirect(req.query.source);
  // console.log(req.isAuthenticated())
  // res.send("OK")
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/login');
});


app.listen(3007, function () {
  console.log("Service 3007-login running on http://127.0.0.1:3007")
})

//=============================================================================
// http server
//=============================================================================
var express = require('express');
var app = express();


//-------------------------------------
// session manangement
//-------------------------------------
var sessionOptions = {
  secret: 'This is a secret',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  resave: false,
  saveUninitialized: false
}
app.use(require('express-session')(sessionOptions));

//-------------------------------------
// authentication
//-------------------------------------
var passport = require('passport');
var request = require('request');
var databaseApi = 'http://127.0.0.1/database/api'

var passStrategyLocal = require('passport-local').Strategy;
passport.use(new passStrategyLocal(function (username, password, cb) {
  let options = {
    url: databaseApi + '/auth/users',
    form: {
      username: username,
      password: password
    }
  };
  request.get(options, (err, response, body) => {
    if (err) {
      console.error(err)
      return cb(err);
    }
    else if (body.length == 0) {
      cb(null, false)
    }
    else cb(null, body[0])
  })
}));

passport.serializeUser(function (user, cb) {
  cb(null, user.username);
});

passport.deserializeUser(function (username, cb) {
  mongodb.db("auth").collection("users").findOne({ username: username }, function (err, user) {
    if (err) return cb(err)
    if (!user) { return cb(null, false); }
    return cb(null, user);
  });
});

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

//-------------------------------------
// proxies
//-------------------------------------
var proxy = require('http-proxy-middleware');
app.use('/authorize/service', proxy({ target: 'http://127.0.0.1:3005', pathRewrite: { '^/authorize/service': '' }, changeOrigin: true }));

//-------------------------------------
// common middlewares
//-------------------------------------
app.use(require('@softroles/authorize-local-user')())
app.use(require('morgan')('tiny'));
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())

//=============================================================================
// api
//=============================================================================
app.get('/authorization/api', function (req, res) {
  res.send({});
});


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

app.get('/403', function (req, res) {
  res.sendStatus(403)
});


app.get('/user', function (req, res) {
  if (req.user) {
    mongodb.db("auth").collection("users").findOne({ token: req.user.token }, function (err, user) {
      if (err) res.send(err)
      else res.send(user)
    });
  }
  else res.send({})
});

//=============================================================================
// start and register service
//=============================================================================
var path = require('path')
var findFreePort = require('find-free-port')
var userEnvVariable = require('@softroles/user-env-variable')
var assert = require('assert')
var serviceName = path.basename(__dirname).toUpperCase()
findFreePort(3000, function (err, port) {
  assert.equal(err, null, 'Could not find a free tcp port.')
  app.listen(Number(port), function () {
    var registers = {
      ['SOFTROLES_SERVICE_' + serviceName + '_PORT']: port
    }
    console.log("Service is registered with following variables:")
    for (reg in registers) {
      console.log('\t - SOFTROLES_SERVICE_' + serviceName + '_PORT', '=', port)
      userEnvVariable.set('SOFTROLES_SERVICE_' + serviceName + '_PORT', port, function (err) {
        assert.equal(err, null, 'Could not register service.')
        console.log("Service running on http://127.0.0.1:" + port)
      })
    }
  })
})
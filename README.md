# passport-zalo

Passport strategy for authenticating with [Zalo](https://zalo.me/), a popular messaging application in Vietnam.

Uses the **Zalo OAuth v4 API** with PKCE (Proof Key for Code Exchange) support.

## Install

    $ npm i @xvn/passport-zalo

## Prerequisites

- A Zalo application with an `app_id` and `app_secret` from [Zalo Developers](https://developers.zalo.me/)
- **Session middleware** (e.g. `express-session`) — required for PKCE flow

## Usage

### Zalo OAuth v4 API

Reference: [Zalo Social API](https://developers.zalo.me/docs/social-api/tai-lieu/tong-quan)

**Parameters:**

| Parameter | Description |
|---|---|
| `app_id` | Application ID |
| `app_secret` | Application Secret (sent via `secret_key` header) |
| `redirect_uri` | Callback URL |
| `code_challenge` | PKCE code challenge (S256, generated automatically) |

**Endpoints:**

| Endpoint | URL |
|---|---|
| Authorization | `https://oauth.zaloapp.com/v4/permission` |
| Access Token | `POST https://oauth.zaloapp.com/v4/access_token` |
| User Profile | `GET https://graph.zalo.me/v2.0/me` (access_token in header) |

### Configure Strategy

```js
var ZaloStrategy = require("@xvn/passport-zalo");

passport.use(
  new ZaloStrategy(
    {
      appId: ZALO_APP_ID,
      appSecret: ZALO_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/zalo/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate({ zaloId: profile.id }, function (err, user) {
        return done(err, user);
      });
    }
  )
);
```

#### Options

| Option | Required | Description |
|---|---|---|
| `appId` | Yes | Zalo application ID |
| `appSecret` | Yes | Zalo application secret |
| `callbackURL` | Yes | URL to redirect after authorization |
| `state` | No | CSRF state parameter |
| `passReqToCallback` | No | When `true`, `req` is passed as the first argument to the verify callback |

#### Verify Callback

The verify callback receives the following arguments:

```js
function (accessToken, refreshToken, profile, done) { }

// or with passReqToCallback: true
function (req, accessToken, refreshToken, profile, done) { }
```

Call `done` with:
- `done(err)` — on error
- `done(null, user)` — on success
- `done(null, false)` — on authentication failure

### Authenticate Requests

Use `passport.authenticate()`, specifying the `'zalo'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

```js
app.get("/auth/zalo", passport.authenticate("zalo"));

app.get(
  "/auth/zalo/callback",
  passport.authenticate("zalo", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  }
);
```

### Full Example

```js
var express = require("express");
var session = require("express-session");
var passport = require("passport");
var ZaloStrategy = require("@xvn/passport-zalo");

var app = express();

// Session is required for PKCE
app.use(
  session({ secret: "your-secret", resave: false, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new ZaloStrategy(
    {
      appId: process.env.ZALO_APP_ID,
      appSecret: process.env.ZALO_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/zalo/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // profile contains: id, name, birthday, gender, picture
      return done(null, profile);
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

app.get("/auth/zalo", passport.authenticate("zalo"));
app.get(
  "/auth/zalo/callback",
  passport.authenticate("zalo", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  }
);

app.listen(3000);
```

## Migration from v1.x

v2.0 updates to the Zalo OAuth **v4 API** with several breaking changes:

| v1.x (Zalo v3 API) | v2.0 (Zalo v4 API) |
|---|---|
| No PKCE | PKCE required (session middleware needed) |
| `verify(req, accessToken, profile, cb)` | `verify(accessToken, refreshToken, profile, done)` |
| No refresh token | Refresh token supported |
| Access token via query param | Access token via header |
| App secret via query param | App secret via `secret_key` header |

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2020 Xuan Nguyen <[https://nguyenthanhxuan.name.vn](https://nguyenthanhxuan.name.vn)>

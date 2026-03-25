"use strict";

var passport = require("passport-strategy"),
  crypto = require("crypto"),
  https = require("https"),
  querystring = require("querystring"),
  util = require("util");

/**
 * `ZaloStrategy` constructor.
 *
 * Options:
 *   - `appId`          Zalo application ID
 *   - `appSecret`      Zalo application secret key
 *   - `callbackURL`    URL to redirect after authorization
 *   - `state`          Optional CSRF state parameter
 *   - `passReqToCallback`  When true, `req` is the first argument to the verify callback
 *
 * The verify callback signature:
 *   function(accessToken, refreshToken, profile, done)
 *   or with passReqToCallback:
 *   function(req, accessToken, refreshToken, profile, done)
 *
 * The `done` callback must be called as:
 *   done(err)          - on error
 *   done(null, user)   - on success
 *   done(null, false)  - on authentication failure
 *
 * @constructor
 * @param {Object} options
 * @param {Function} verify
 */
function ZaloStrategy(options, verify) {
  if (typeof options === "function") {
    verify = options;
    options = undefined;
  }
  options = options || {};

  if (!verify) {
    throw new TypeError("ZaloStrategy requires a verify callback");
  }
  if (!options.appId) {
    throw new TypeError("ZaloStrategy requires an appId option");
  }
  if (!options.appSecret) {
    throw new TypeError("ZaloStrategy requires an appSecret option");
  }
  if (!options.callbackURL) {
    throw new TypeError("ZaloStrategy requires a callbackURL option");
  }

  passport.Strategy.call(this);
  this.name = "zalo";
  this._verify = verify;
  this._options = options;
  this._authURL = "https://oauth.zaloapp.com/v4/permission";
  this._accessTokenURL = "https://oauth.zaloapp.com/v4/access_token";
  this._profileURL = "https://graph.zalo.me/v2.0/me";
  this._passReqToCallback = options.passReqToCallback || false;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(ZaloStrategy, passport.Strategy);

/**
 * Generate a PKCE code verifier (43-128 chars, URL-safe).
 *
 * @return {String}
 * @api private
 */
ZaloStrategy.prototype._generateCodeVerifier = function () {
  return crypto.randomBytes(32).toString("base64url");
};

/**
 * Generate a PKCE code challenge from a code verifier using S256.
 *
 * @param {String} verifier
 * @return {String}
 * @api private
 */
ZaloStrategy.prototype._generateCodeChallenge = function (verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
};

/**
 * Authenticate request by redirecting to Zalo or exchanging the authorization code.
 *
 * @param {Object} req
 * @param {Object} [options]
 */
ZaloStrategy.prototype.authenticate = function (req, options) {
  options = options || {};
  var self = this;

  if (req.query && req.query.code) {
    // Callback phase: exchange authorization code for access token
    var codeVerifier =
      req.session && req.session._zaloCodeVerifier
        ? req.session._zaloCodeVerifier
        : null;

    // Clean up session
    if (req.session) {
      delete req.session._zaloCodeVerifier;
    }

    if (!codeVerifier) {
      return self.error(
        new Error(
          "Missing PKCE code_verifier. Ensure session middleware is configured."
        )
      );
    }

    self._exchangeCode(req.query.code, codeVerifier, function (err, data) {
      if (err) {
        return self.error(err);
      }

      var accessToken = data.access_token;
      var refreshToken = data.refresh_token;

      self._getUserProfile(accessToken, function (err, profile) {
        if (err) {
          return self.error(err);
        }

        function verified(err, user, info) {
          if (err) {
            return self.error(err);
          }
          if (!user) {
            return self.fail(info);
          }
          self.success(user, info);
        }

        if (self._passReqToCallback) {
          self._verify(req, accessToken, refreshToken, profile, verified);
        } else {
          self._verify(accessToken, refreshToken, profile, verified);
        }
      });
    });
  } else {
    // Authorization phase: redirect to Zalo
    var codeVerifier = self._generateCodeVerifier();
    var codeChallenge = self._generateCodeChallenge(codeVerifier);

    // Store code_verifier in session for the callback phase
    if (!req.session) {
      return self.error(
        new Error(
          "ZaloStrategy requires session middleware for PKCE support."
        )
      );
    }
    req.session._zaloCodeVerifier = codeVerifier;

    var authUrl = new URL(self._authURL);
    authUrl.searchParams.set("app_id", self._options.appId);
    authUrl.searchParams.set("redirect_uri", self._options.callbackURL);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    if (self._options.state || options.state) {
      authUrl.searchParams.set(
        "state",
        options.state || self._options.state
      );
    }

    self.redirect(authUrl.toString());
  }
};

/**
 * Exchange authorization code for access token.
 *
 * POST https://oauth.zaloapp.com/v4/access_token
 * Headers: Content-Type: application/x-www-form-urlencoded, secret_key: <app_secret>
 * Body: code, app_id, grant_type=authorization_code, code_verifier
 *
 * @param {String} code
 * @param {String} codeVerifier
 * @param {Function} done - callback(err, tokenData)
 * @api private
 */
ZaloStrategy.prototype._exchangeCode = function (code, codeVerifier, done) {
  var postData = querystring.stringify({
    code: code,
    app_id: this._options.appId,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  var tokenUrl = new URL(this._accessTokenURL);
  var requestOptions = {
    hostname: tokenUrl.hostname,
    path: tokenUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: this._options.appSecret,
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  var req = https.request(requestOptions, function (res) {
    var chunks = [];
    res.on("data", function (chunk) {
      chunks.push(chunk);
    });
    res.on("end", function () {
      try {
        var body = Buffer.concat(chunks).toString();
        var data = JSON.parse(body);
        if (data.error || data.error_code) {
          return done(
            new Error(
              data.error_description ||
                data.error_message ||
                "Failed to obtain access token"
            )
          );
        }
        done(null, data);
      } catch (e) {
        done(new Error("Failed to parse access token response"));
      }
    });
  });

  req.on("error", function (err) {
    done(err);
  });

  req.write(postData);
  req.end();
};

/**
 * Fetch user profile from Zalo Graph API.
 *
 * GET https://graph.zalo.me/v2.0/me?fields=id,name,birthday,gender,picture
 * Headers: access_token: <user_access_token>
 *
 * @param {String} accessToken
 * @param {Function} done - callback(err, profile)
 * @api private
 */
ZaloStrategy.prototype._getUserProfile = function (accessToken, done) {
  var profileUrl = new URL(this._profileURL);
  profileUrl.searchParams.set("fields", "id,name,birthday,gender,picture");

  var requestOptions = {
    hostname: profileUrl.hostname,
    path: profileUrl.pathname + profileUrl.search,
    method: "GET",
    headers: {
      access_token: accessToken,
    },
  };

  var req = https.request(requestOptions, function (res) {
    var chunks = [];
    res.on("data", function (chunk) {
      chunks.push(chunk);
    });
    res.on("end", function () {
      try {
        var body = Buffer.concat(chunks).toString();
        var profile = JSON.parse(body);
        if (profile.error || profile.error_code) {
          return done(
            new Error(
              profile.error_description ||
                profile.message ||
                "Failed to fetch user profile"
            )
          );
        }
        done(null, profile);
      } catch (e) {
        done(new Error("Failed to parse user profile response"));
      }
    });
  });

  req.on("error", function (err) {
    done(err);
  });

  req.end();
};

/**
 * Expose `ZaloStrategy`.
 */
module.exports = ZaloStrategy;

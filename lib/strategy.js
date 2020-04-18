/**
 * Module dependencies.
 */
var passport = require("passport-strategy"),
  url = require("url"),
  https = require("https"),
  util = require("util");

/**
 * `Strategy` constructor.
 *
 * @constructor
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function ZaloStrategy(options, verify) {
  if (typeof options == "function") {
    verify = options;
    options = undefined;
  }
  options = options || {};

  if (!verify) {
    throw new TypeError("ZaloStrategy requires a verify callback");
  }
  if (!options.appId) {
    throw new TypeError("ZaloStrategy requires an app_id option");
  }
  if (!options.appSecret) {
    throw new TypeError("ZaloStrategy requires an app_secret option");
  }
  if (!options.callbackURL) {
    throw new TypeError("ZaloStrategy require an Callback URL option");
  }

  passport.Strategy.call(this);
  this.name = "zalo";
  this._verify = verify;
  this._options = options;
  this._authURL = "https://oauth.zaloapp.com/v3/auth";
  this._accessTokenURL = "https://oauth.zaloapp.com/v3/access_token";
  this._getProfileURL = "https://graph.zalo.me/v2.0/me?access_token";
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(ZaloStrategy, passport.Strategy);

/**
 * Authenticate request.
 *
 * This function must be overridden by subclasses.  In abstract form, it always
 * throws an exception.
 *
 * @param {Object} req The request to authenticate.
 * @param {Object} [options] Strategy-specific options.
 * @api public
 */

ZaloStrategy.prototype.authenticate = function (req, options) {
  options = options || {};
  var self = this;

  if (req.query && req.query.code) {
    // TODO get authen code by using https.get
    self.getOAuthAccessToken(req.query.code, function (status, oauthData) {
      if (status === "error") {
        return self.error(oauthData);
      } else if (status === "success") {
        self.getUserProfile(oauthData, function (
          userProfileStatus,
          userProfileData
        ) {
          if (userProfileStatus === "error") {
            return self.error(userProfileData);
          } else if (userProfileStatus === "success") {
            self._verify(
              req,
              oauthData.access_token,
              userProfileData,
              function (user) {
                self.success(user);
              }
            );
          }
        });
      }
    });
  } else {
    // Building URL for get Access token
    var authUrlObject = url.parse(self._authURL);
    var params = {
      app_id: self._options.appId,
      redirect_uri: self._options.callbackURL,
      state: self._options.state,
    };

    authUrlObject.query = params;

    var location = url.format(authUrlObject);

    this.redirect(location);
  }
};

/**
 * Get access token when have code return from request permission
 * URL to load is: https://oauth.zaloapp.com/v3/access_token?app_id={1}&app_secret={2}&code={3}
 *
 * @param {String} code
 * @param {Function} done
 * @api private
 */
ZaloStrategy.prototype.getOAuthAccessToken = function (code, done) {
  var accessTokenURLObject = url.parse(this._accessTokenURL);
  var accessTokenParams = {
    app_id: this._options.appId,
    app_secret: this._options.appSecret,
    code: code,
  };

  accessTokenURLObject.query = accessTokenParams;
  var accessTokenURL = url.format(accessTokenURLObject);
  accessTokenURLObject = url.parse(accessTokenURL);

  const requestOptions = {
    hostname: accessTokenURLObject.hostname,
    path: accessTokenURLObject.path,
    method: "GET",
  };

  const accessTokenRequest = https.request(requestOptions, (res) => {
    res.on("data", (d) => {
      const accessTokenObject = JSON.parse(d);
      done("success", accessTokenObject);
    });
  });

  accessTokenRequest.on("error", (error) => {
    done("error", error);
  });

  accessTokenRequest.end();
};

/**
 * Load basic user profile when we have access token
 * URL to load is: https://graph.zalo.me/v2.0/me?access_token=<User_Access_Token>&fields=id,birthday,name,gender,picture
 *
 * @param {String} accessTokenObject
 * @param {Function} done
 * @api private
 */

ZaloStrategy.prototype.getUserProfile = function (accessTokenObject, done) {
  var userProfileURL = this._getProfileURL;
  var userProfileObject = url.parse(userProfileURL);

  var userProfileQuery = {
    access_token: accessTokenObject.access_token,
    fields: "id,birthday,name,gender,picture",
  };

  userProfileObject.query = userProfileQuery;
  var userProfileURL = url.format(userProfileObject);
  userProfileObject = url.parse(userProfileURL);

  const requestOptions = {
    hostname: userProfileObject.hostname,
    path: userProfileObject.path,
    method: "GET",
  };

  const accessTokenRequest = https.request(requestOptions, (res) => {
    res.on("data", (d) => {
      const userProfile = JSON.parse(d);
      done("success", userProfile);
    });
  });

  accessTokenRequest.on("error", (error) => {
    done("error", error);
  });

  accessTokenRequest.end();
};

/**
 * Expose `Strategy`.
 */
module.exports = ZaloStrategy;

# passport-zalo

Passport strategy for authenticating with Zalo. An application popular in Viet Nam

## Reason to make this

Zalo using OAuth2 method to authenciation but don't know why they are use different url parameter with OAuth2.

OAuth2 using: `clientID`, `clientSecret` but Zalo using `app_id`, `app_secret`

## Install

    $ npm i @xvn/passport-zalo

## Usage

### Basic conept

Reference document: [Zalo Development](https://developers.zalo.me/docs/api/social-api/tai-lieu/bat-dau-nhanh-post-1011)

List of parameter using on Zalo:

- app_id: Application ID
- app_secret: Application Secret
- redirect_uri: Callback URL

List of URL using on Zalo:

- Auth URL: [https://oauth.zaloapp.com/v3/auth?app_id={1}&redirect_uri={2}&state={3}](https://oauth.zaloapp.com/v3/auth?app_id={1}&redirect_uri={2}&state={3})
- Get ACCESS TOKEN: [https://oauth.zaloapp.com/v3/access_token?app_id={1}&app_secret={2}&code={3}](https://oauth.zaloapp.com/v3/access_token?app_id={1}&app_secret={2}&code={3})
- Callback URL: it is on your app; example: [http://your-callback.com?code=123456&state={state-params}](http://your-callback.com?code=123456&state={state-params})
- Get Profile user: [https://graph.zalo.me/v2.0/me?access_token=<User_Access_Token>&fields=id,birthday,name,gender,picture](https://graph.zalo.me/v2.0/me?access_token=<User_Access_Token>&fields=id,birthday,name,gender,picture)

### Configure Strategy

```js
passport.use(
  new ZaloStategy(
    {
      appId: ZALO_APP_ID,
      appSecret: ZALO_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/callback",
      state: "test",
    },
    function (request, accessToken, profile, cb) {
      // Do anything with params above
      return cb(profile);
    }
  )
);
```

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
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);
```

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2020 Xuan Nguyen <[https://nguyenthanhxuan.name.vn](https://nguyenthanhxuan.name.vn)> @Email at [xuan12k@gmail.com](mailto:xuan12k@gmail.com)

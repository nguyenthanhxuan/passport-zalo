# passport-zalo

Passport strategy for authenticating with Zalo. An application popular in Viet Nam

## zalo using OAuth2 method to authenciation but don't know why they are use different url parameter with OAuth2.

List of parameter using on Zalo:

- app_id: Application ID
- app_secret: Application Secret
- redirect_uri: Callback URL

List of URL using on Zalo:

- Auth URL: https://oauth.zaloapp.com/v3/auth?app_id={1}&redirect_uri={2}&state={3}
- Get ACCESS TOKEN: https://oauth.zaloapp.com/v3/access_token?app_id={1}&app_secret={2}&code={3}
- Callback URL: it is on your app; example: http://your-callback.com?code=123456&state={state-params}
- Get Profile user: https://graph.zalo.me/v2.0/me?access_token=<User_Access_Token>&fields=id,birthday,name,gender,picture

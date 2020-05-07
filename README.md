# Discourse Twitch Sidebar

This plugin creates a widget that allows users to enter a comma delimited list of twitch users to be displayed in an active live stream block.
It iterates through the list of users and displays them in a widget called 'twitch'.


## Plugin Settings

It creates two plugin settings
- Block Title - text field for the block title
- Twitch Streamers - comma delimited set of twitch users to display
- Twitch Featured Streamers - This is a list of twitch users that will be "promoted" above the other twitch users if they are online.
- Twitch Client ID - The client id of your app to authenticate
- Twitch app token - The Oauth token for your app.

## Setup

This plugin depends on the [layouts plugin](https://meta.discourse.org/t/custom-layouts-plugin/55208) for discourse. It can be placed into a region via layouts.

Additionally you will need a twitch app client id and oauth twitch_sidebar_access_token

https://dev.twitch.tv/docs/authentication/getting-tokens-oauth

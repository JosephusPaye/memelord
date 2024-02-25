# Meme Lord

<a href="https://slack.com/oauth/v2/authorize?client_id=580442220775.1325584195287&scope=channels:history,chat:write,commands,incoming-webhook,reactions:read&user_scope="><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

<img src="./memelord.png" alt="Meme Lord icon" width="112" height="112" align="left" style="margin-right: 24px" />

Meme Lord is a Slack bot that can be used to automatically tally up reactions to posts in your meme channel and award a winner! It makes a great companion when doing meme reviews.

This project is part of [#CreateWeekly](https://twitter.com/JosephusPaye/status/1214853295023411200), my attempt to create something new publicly every week in 2020.

## Features

-   Create dividers to separate group of posts (for a weekly meme review for example)
-   Automatically tally up and sort unique user reactions to each post
-   Award up to three winners
-   View a leaderboard of previous winners

## How to install

<a href="https://slack.com/oauth/v2/authorize?client_id=580442220775.1325584195287&scope=channels:history,chat:write,commands,incoming-webhook,reactions:read&user_scope="><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

-   Click the button above to install Meme Lord into your Slack workspace. During installation, give the app permission to access your meme channel (e.g. _#random_). The app should appear in the sidebar of your Slack workspace after successful installation.
-   Go to your meme channel on Slack and invite Meme Lord by typing `/invite @memelord` and confirming
-   You are now ready to use Meme Lord. See the commands below for how to use.

## Commands

| Command        | Format                                                                                                                                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/divide`      | `/divide`                                                                                                                                                                      | Create a divider for a new set of posts. This divider will be used when you run `/tally` without an argument.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `/tally`       | <code>/tally</code> <br>or<br> <code>/tally&nbsp;[start&nbsp;message]</code> <br>or<br> <code>/tally&nbsp;[start&nbsp;message]&nbsp;[end&nbsp;message]</code>                  | Tally reactions to posts since the last divider, or if specified, since the given message or between the given messages. <br>**Arguments**: <ul><li><code>[message link start]</code> (optional) - the link of a message to use as divider. If specified, tally counts all messages since that message (excluding the message).</li><li><code>[message link end]</code> (optional) - the link of a message to use as end divider. If specified in addition to `[message link start]`, tally counts all messages between the start and end messages (excluding them).</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `/award`       | <code>/award</code> <br>or<br> <code>/award&nbsp;[start&nbsp;message]&nbsp;[end&nbsp;message]</code> <br>or<br> <code>/award&nbsp;<@first>&nbsp;[@second]&nbsp;[@third]</code> | Award one or more users as winner. If no arguments are given, will automatically pick winners (based on unique reaction count) for first, second, and third place.<br>When given message link arguments, will automatically pick winners by tallying the messages delimited by the given links (see `/tally` for details).<br>When given username arguments, each winner can be `@`-mentioned using their user name. The winners will be added to the leaderboard.<br>**Username Arguments**: <ul><li><code>&lt;@first&gt;</code> (required) - the first place winner. Up to three first place winners may be specified by separating with a comma: <code>@firstA,@firstB,@firstC</code></li><li><code>[@second]</code> (optional) - the second place winner. Up to three second place winners may be specified as with first place.</li><li><code>[@third]</code> (optional) - the third place winner. Up to three third place winners may be specified as with first and second places.</li></ul> |
| `/leaderboard` | `/leaderboard`                                                                                                                                                                 | Show the leaderboard of previous winners.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Privacy

If you use the Meme Lord app from the Slack directory, the following details are sent to and stored on our servers. They are necessary to run the app.

-   The name and identifier of the Slack workspace
-   The name and identifier of the channel the app was installed into, as well as the app's secret access token
-   The user identifier of the app in your workspace
-   The user identifiers (not names) of winners and the user running the command when you run `/award`. These are stored for the leaderboard.
-   The message identifier of the last divider when you run `/divide`

You can run the app on your own server (requires Node.js and MongoDB) if you don't wish to expose the above data. See below for how to do so.

## Self hosting

You can make changes and host the app on your own server. You'll need Git, Node.js, and MongoDB on the server.

-   [Create](https://api.slack.com/apps/new) an app on Slack
    -   On the **Basic Information** page of the app's settings, under **Add features and functionality**, enable incoming webhooks, slash commands and bots
    -   On the **OAuth &amp; Permissions** page, add the following scopes: `app_mentions:read`, `channels:history`, `chat:write`, `commands`, `incoming-webhook`, `reactions:read`
    -   Add `https://<app url on your server>/install/auth` as the OAuth redirect URL
    -   On the **Slash Commands** page, add the `/divide`, `/tally`, `/award`, and `/leaderboard` commands, and set them to post to `https://<app url on your server>/api/messages`
-   Clone this repository to your server and run `yarn` to install dependencies
-   Copy the `.env.example` file to `.env` and fill out the credentials from Slack
-   You may also set the `RESTRICT_AWARD_TO` variable to restrict who can run the `/award` command. See `.env.example` for an example.
-   Build the source code by running `yarn build`
-   Ensure that the Mongo daemon is running
-   Start the app by running `yarn start`. The app will listen on port 3000. Expose this port using a webserver proxy if you need to.
-   Install the app into your workspace by going to `https://<app url on your server>/install`
-   Go to your meme channel on Slack and invite Meme Lord by typing `/invite @memelord`
-   You are now ready to use Meme Lord. See the commands above for how to use.

## Licence

[MIT](LICENCE)

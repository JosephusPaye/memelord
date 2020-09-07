# Meme Lord

Meme Lord is a Slack bot that can be used to automatically tally up reactions to posts in your meme channel and award a winner! It makes for a great companion when doing meme reviews.

This project is part of [#CreateWeekly](https://dev.to/josephuspaye/createweekly-create-something-new-publicly-every-week-in-2020-1nh9), my attempt to create something new publicly every week in 2020.

## Features

-   Create dividers to separate group of posts (for a weekly meme review for example)
-   Automatically tally up and sort unique user reactions to each post
-   Award up to three winners
-   View a leaderbaord of previous winners

## How to install

-   Install the app into your Slack workspace by searching for "Meme Lord" on the Slack Apps directory. During installation, give the app permission to access your meme channel (e.g. _#random_). The app should appear in the sidebar of your Slack workspace after successful installation.
-   Go to your meme channel on Slack and invite Meme Lord by typing `/invite @memelord` and confirming
-   You are now ready to use Meme Lord. See the commands below for how to use.

## Commands

| Command        | Format                                                         | Description                                                                                                                                                                                                                                                                                                                     |
| :------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/divide`      | `/divide`                                                      | Create a divider for a new set of posts. This divider will be used when you run `/tally` without an argument.                                                                                                                                                                                                                   |
| `/tally`       | `/tally [message link]`                                        | Tally reactions to posts since the last divider, or if specified, since the given message. <br>**Arguments**: <ul><li><code>[message link]</code> (optional) - the link of a message to use as the divider.</li></ul>                                                                                                           |
| `/award`       | <code>/award&nbsp;<@first>&nbsp;[@second]&nbsp;[@third]</code> | Award one or more users as winner. Each user is `@`-mentioned using their user name. <br>**Arguments**: <ul><li><code>&lt;@first&gt;</code> (required) - the first place winner</li><li><code>[@second]</code> (optional) - the second place winner</li><li><code>[@third]</code> (optional) - the third place winner</li></ul> |
| `/leaderboard` | `/leaderboard`                                                 | Show the leaderboard of past winners.                                                                                                                                                                                                                                                                                           |

## Licence

[MIT](LICENCE)

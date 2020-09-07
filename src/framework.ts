import { Botkit } from 'botkit';
import {
    SlackAdapter,
    SlackMessageTypeMiddleware,
    SlackEventMiddleware,
} from 'botbuilder-adapter-slack';
import { Request, Response } from 'express';

import { AdapterStorage, AppStorage } from './storage';

export function createSlackBot(
    adapterStorage: AdapterStorage,
    appStorage: AppStorage
) {
    const adapter = new SlackAdapter({
        oauthVersion: 'v2',

        // parameters used to secure webhook endpoint
        verificationToken: process.env.VERIFICATION_TOKEN,
        clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,

        // auth token for a single-team app
        // botToken: process.env.BOT_TOKEN,

        // credentials used to set up oauth for multi-team apps
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: [
            'app_mentions:read',
            'channels:history',
            'chat:write',
            'commands',
            'emoji:read',
            'incoming-webhook',
            'reactions:read',
            'reactions:write',
        ],
        redirectUri: process.env.REDIRECT_URI,

        // functions required for retrieving team-specific info
        // for use in multi-team apps
        getTokenForTeam(teamId) {
            return appStorage.getTeamAccessToken(teamId);
        },

        getBotUserByTeam(teamId) {
            return appStorage.getTeamBotUser(teamId);
        },
    });

    // Use SlackEventMiddleware to emit events that match their original Slack event types.
    adapter.use(new SlackEventMiddleware());

    // Use SlackMessageType middleware to further classify messages as direct_message, direct_mention, or mention
    adapter.use(new SlackMessageTypeMiddleware());

    const controller = new Botkit({
        webhook_uri: '/api/messages',
        adapter,
        storage: adapterStorage,
    });

    createDefaultRoutes(controller, appStorage);

    return { adapter, controller };
}

function createDefaultRoutes(controller: Botkit, appStorage: AppStorage) {
    // The bot's default route
    controller.webserver.get('/', (req: Request, res: Response) => {
        res.send(
            `🤖 Meme Lord is up and running with Botkit v${controller.version}.`
        );
    });

    // `/install` redirects to Slack with the bot's details for installation in a Slack workspace
    controller.webserver.get('/install', (req: Request, res: Response) => {
        // getInstallLink() points to Slack's OAuth endpoint and includes `clientId` and `scopes`
        res.redirect(controller.adapter.getInstallLink());
    });

    // Slack redirects to `/install/auth` with the team and bot user details, which we save
    controller.webserver.get(
        '/install/auth',
        async (req: Request, res: Response) => {
            try {
                const results = await controller.adapter.validateOauthCode(
                    req.query.code
                );

                // Store the team's access token in the TeamAccessTokens collection
                await appStorage.saveTeamAccessToken({
                    teamId: results.team.id,
                    teamName: results.team.name,
                    channel: results.incoming_webhook.channel,
                    channelId: results.incoming_webhook.channel_id,
                    accessToken: results.access_token,
                });

                // Store the team's bot user
                await appStorage.saveTeamBotUser({
                    teamId: results.team.id,
                    botUserId: results.bot_user_id,
                });

                // Show confirmation
                res.send(
                    `Success! Meme Lord installed into ${results.team.name} ${results.incoming_webhook.channel}`
                );
            } catch (err) {
                console.error('OAUTH ERROR:', err);
                res.status(401);
                res.send(err.message);
            }
        }
    );
}

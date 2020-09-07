require('dotenv').config();

import { BotWorker, BotkitMessage } from 'botkit';
import { WebClient } from '@slack/web-api';

import { createStorage } from './storage';
import { createSlackBot } from './framework';
import { BotError } from './feedback';
import { divide } from './commands/divide';
import { tally } from './commands/tally';
import { award } from './commands/award';
import { leaderboard } from './commands/leaderboard';

export type SlackBotkitWorker = BotWorker & {
    api?: WebClient;
};

export function debug(...values: any[]) {
    if (process.env.DEBUG) {
        console.log(...values);
    }
}

async function main() {
    const { adapterStorage, appStorage } = await createStorage();
    const { controller } = createSlackBot(adapterStorage, appStorage);

    controller.ready(() => {
        console.info('🤖 Meme Lord booted and ready');
    });

    controller.on(
        'slash_command',
        async (bot: SlackBotkitWorker, message: BotkitMessage) => {
            debug('slash command received', message);

            try {
                if (message.command === '/divide') {
                    await divide(bot, message, appStorage);
                } else if (message.command === '/tally') {
                    await bot.reply(message, '⌛ Tallying...');
                    await bot.changeContext(message.reference); // Refresh proxy to create another reply
                    await tally(bot, message, appStorage);
                } else if (message.command === '/award') {
                    await award(bot, message, appStorage);
                } else if (message.command === '/leaderboard') {
                    await bot.reply(message, '⌛ Fetching leaderboard...');
                    await bot.changeContext(message.reference); // Refresh proxy to create another reply
                    await leaderboard(bot, message, appStorage);
                } else {
                    console.error('invalid slash command', message.command);
                }
            } catch (err) {
                if (err instanceof BotError) {
                    console.error('Bot error', err, message);
                    await bot.reply(message, err.toString());
                } else {
                    console.error('Uncaught error: ', err, message);
                    await bot.reply(
                        message,
                        `⚠ An unexpected error occured. Error: ${err.message}`
                    );
                }
            }
        }
    );
}

main();

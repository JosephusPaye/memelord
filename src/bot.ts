require('dotenv').config();

import { createStorage, AppStorage } from './storage';
import { createSlackBot } from './framework';
import { BotWorker, BotkitMessage } from 'botkit';
import {
    WebClient,
    WebAPICallResult,
    ConversationsHistoryArguments,
} from '@slack/web-api';

type SlackBotkitWorker = BotWorker & {
    api?: WebClient;
};

const MESSAGE_API_ERROR = '⚠ Slack API request failed.';
const MESSAGE_DIVIDER = '➡➡➡ DIVIDER 🔶 DIVIDER 🔵 DIVIDER 🔶 DIVIDER ⬅⬅⬅';
const MESSAGE_DIVIDER_NOT_FOUND =
    '⚠ No divider found. Type `/tally <message link>` to use the message with the given link as the divider.';

async function main() {
    const { adapterStorage, appStorage } = await createStorage();
    const { controller } = createSlackBot(adapterStorage, appStorage);

    controller.ready(() => {
        console.log('🤖 Meme Lord booted and ready');
    });

    controller.on(
        'slash_command',
        async (bot: SlackBotkitWorker, message: BotkitMessage) => {
            if (message.command === '/divide') {
                await divide(bot, message, appStorage);
            } else if (message.command === '/tally') {
                await tally(bot, message, appStorage);
            }
        }
    );
}

async function divide(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const { id } = await bot.reply(message, MESSAGE_DIVIDER);

    const divider = {
        teamId: message.team_id,
        dividerMessageId: id,
    };

    await appStorage.saveDivider(divider);

    console.log('Saved divider:', divider);
}

interface ApiResultMessage {
    bot_id?: string;
    type: string;
    text: string;
    user: string;
    ts: string;
    team: string;
    bot_profile?: any;
    blocks?: any[];
    reactions?: any[];
}

async function tally(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const teamId = message.incoming_message.channelData.team_id;
    const divider = await getDivider(message.text, teamId, appStorage);

    if (!divider) {
        await bot.reply(message, MESSAGE_DIVIDER_NOT_FOUND);
        return;
    }

    const query = {
        channel: message.channel,
        oldest: divider,
        inclusive: true,
    };

    const result = await bot.api!.conversations.history(query);

    if (!result.ok) {
        bot.reply(
            message,
            MESSAGE_API_ERROR + ' Error: ' + (result.error ?? '<no error 🤷‍♂️>')
        );
        return;
    }

    const initialMessages = result.messages as ApiResultMessage[];

    // The oldest message will be the divider, otherwise the divider was not found.
    if (
        initialMessages.length === 0 ||
        initialMessages[initialMessages.length - 1].ts !== divider
    ) {
        await bot.reply(message, MESSAGE_DIVIDER_NOT_FOUND);
        return;
    }

    const botUserId = await appStorage.getTeamBotUser(teamId);
    let messages: ApiResultMessage[] = [];

    try {
        messages = await paginateAndFilterMessages(
            initialMessages.slice(0, -1),
            result,
            bot,
            query,
            botUserId
        );
    } catch (err) {
        bot.reply(
            message,
            MESSAGE_API_ERROR + ' Error: ' + (err ?? '<no error 🤷‍♂️>')
        );
    }

    const candidateMessages = messages
        .map((message) => {
            return {
                ts: message.ts,
                user: message.user,
                reactionCount: message.reactions ? message.reactions.length : 0,
            };
        })
        .filter((message) => message.reactionCount > 0)
        .sort(
            (messageA, messageB) =>
                messageB.reactionCount - messageA.reactionCount
        );

    const tally = candidateMessages.slice(0, 5).map((message) => {
        return `• *${message.reactionCount}* ${
            message.reactionCount === 1 ? 'reaction' : 'reactions'
        }: <@${
            message.user
        }> (<https://comp3850wil.slack.com/archives/CH2PRFQDU/p${message.ts.replace(
            '.',
            ''
        )}|view post>)`; // TODO: Make the link dynamic
    });

    const reply =
        tally.length > 0
            ? `📊 ${
                  tally.length > 5 ? 'Top 5 posts' : 'Tally of posts'
              } since the last divider:\n${tally.join('\n')}`
            : 'No posts with reactions since the last divider.';

    console.log('tally', reply);

    await bot.reply(message, reply);
}

// Message permalink looks like this: https://comp3850wil.slack.com/archives/CH2PRFQDU/p1599393257001900
// The digits after `p` in the last segment are the message "id", it's the "ts" field in the API,
// without the dot that separates the first set of digits from the last 6 digits.
// So "p1599393257001900" (from permalink) => "1599393257.001900" (ts)
const messagePermalinkIdRegex = /https?:\/\/.*\.slack\.com\/archives\/.*\/p(\d*)/;

async function getDivider(
    text: string | undefined,
    teamId: string,
    appStorage: AppStorage
) {
    if (!text) {
        return await appStorage.getDivider(teamId);
    } else {
        const matches = messagePermalinkIdRegex.exec(text);

        if (matches) {
            const id = matches[1];
            return [
                id.slice(0, -6), // from start to before 6 chars
                id.replace(id.slice(0, -6), ''), // last 6 chars
            ].join('.');
        } else {
            return await appStorage.getDivider(teamId);
        }
    }
}

async function paginateAndFilterMessages(
    messages: ApiResultMessage[],
    result: WebAPICallResult,
    bot: SlackBotkitWorker,
    query: ConversationsHistoryArguments,
    botUserId: string
) {
    if (result.has_more) {
        await getNextPage(messages, result, bot, query);
    }

    // Remove messages by the bot
    return messages.filter((message) => {
        return message.user !== botUserId;
    });
}

async function getNextPage(
    messages: ApiResultMessage[],
    previousResult: WebAPICallResult,
    bot: SlackBotkitWorker,
    query: ConversationsHistoryArguments
) {
    const result = await bot.api!.conversations.history(
        Object.assign({}, query, {
            cursor: previousResult.response_metadata?.next_cursor,
        })
    );

    if (!result.ok) {
        throw result.error;
    }

    messages.push(...(result.messages as ApiResultMessage[]));

    if (result.has_more) {
        getNextPage(messages, result, bot, query);
    }
}

main();

import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker } from '../bot';
import { BotError, BotErrorType } from '../feedback';
import { AppStorage } from '../storage';

import { tallyMessages } from './tally-support';

export async function extractAwardees(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
): Promise<string[][]> {
    const messageText = message.text ? message.text.trim() : '';

    const places =
        messageText.length > 0
            ? extractAwardeesFromMessage(messageText)
            : await extractAwardeesFromTally(bot, message, appStorage);

    if (places.length === 0) {
        throw new BotError(BotErrorType.NO_AWARDEE);
    }

    return places;
}

// https://regexr.com/5bikn
const userMentionRegex = /(?:<@(\w+)\|[\w\.]+>)/g;

function extractAwardeesFromMessage(messageText: string): string[][] {
    // Message text format: @1a/@1b/@1c @2a @3a/@3b/@3c
    // see award-support.test.js for more examples

    // Places (list of usernames) are 1st, 2nd, and 3rd
    // [ [@a, @b, @c], [@d], [@f, @g] ]
    const places = messageText
        .split(' ')
        .map((placeStr) => placeStr.trim())
        .filter((placeStr) => placeStr.length > 0)
        .map((placeStr) => {
            const matches = Array.from(placeStr.matchAll(userMentionRegex));

            const userNames = matches.map((match) => {
                return match[1]; // [1] is the first capturing group, the user ID
            });

            // Dedupe the user names in this group
            return Array.from(new Set(userNames)).slice(0, 3);
        })
        .filter((placeList) => {
            return placeList.length > 0;
        })
        .slice(0, 3);

    return places;
}

async function extractAwardeesFromTally(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
): Promise<string[][]> {
    const candidates = await tallyMessages(bot, message, appStorage);

    const groups = groupBy(candidates, 'reactionCount')
        .sort((groupA, groupB) => {
            return groupB[0].reactionCount - groupA[0].reactionCount;
        })
        .slice(0, 3);

    const places = groups.map((group) => {
        return group.map((candidate) => candidate.user);
    });

    return places;
}

function groupBy<T>(array: T[], key: keyof T): T[][] {
    const groups: T[][] = [];

    for (const item of array) {
        const keyValue = item[key];

        const group = groups.find((group) => group[0][key] === keyValue);

        if (group) {
            group.push(item);
        } else {
            groups.push([item]);
        }
    }

    return groups;
}

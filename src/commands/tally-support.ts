import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker } from '../bot';
import { AppStorage } from '../storage';
import { BotError, BotErrorType } from '../feedback';
import { getMessagesSinceDivider } from '../api';

export async function tallyMessages(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const teamId = message.incoming_message.channelData.team_id;
    const divider = await getDivider(message.text, teamId, appStorage);

    const messages = await getMessagesSinceDivider(bot.api!, divider, {
        channel: message.channel,
        botUserId: await appStorage.getTeamBotUser(teamId),
    });

    const candidateMessages = messages
        .map((candidate) => {
            const uniqueUserReactions = new Set<string>();

            if (candidate.reactions) {
                for (const reaction of candidate.reactions) {
                    for (const user of reaction.users) {
                        uniqueUserReactions.add(user);
                    }
                }
            }

            return {
                ts: candidate.ts,
                user: candidate.user,
                reactionCount: uniqueUserReactions.size,
                permalink: '',
            };
        })
        .filter((candidate) => candidate.reactionCount > 0)
        .sort(
            (candidateA, candidateB) =>
                candidateB.reactionCount - candidateA.reactionCount
        );

    return candidateMessages;
}

// Message permalinks are of this form: https://comp3850wil.slack.com/archives/CH2PRFQDU/p1599393257001900
// The digits after `p` in the last segment are the message "id". They're the "ts" field in the API,
// but without the dot that separates the first set of digits from the last 6 digits in "ts".
// So "p1599393257001900" (permalink last segment) ==> "1599393257.001900" (ts field)
const messagePermalinkIdRegex = /https?:\/\/.*\.slack\.com\/archives\/.*\/p(\d*)/;

async function getDivider(
    text: string | undefined,
    teamId: string,
    appStorage: AppStorage
) {
    let divider: string;

    if (!text || text.trim().length === 0) {
        divider = await appStorage.getDivider(teamId);

        if (!divider) {
            throw new BotError(BotErrorType.LAST_DIVIDER_NOT_FOUND);
        }
    } else {
        const matches = messagePermalinkIdRegex.exec(text);

        if (matches) {
            const id = matches[1];
            divider = [
                id.slice(0, -6), // from start to before last 6 chars
                id.replace(id.slice(0, -6), ''), // last 6 chars
            ].join('.');
        } else {
            throw new BotError(BotErrorType.GIVEN_DIVIDER_NOT_FOUND);
        }
    }

    return divider;
}

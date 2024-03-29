import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker } from '../bot';
import { AppStorage } from '../storage';
import { BotError, BotErrorType } from '../feedback';
import { getMessagesDelimitedByDividers } from '../api';

interface TallyMessage {
    ts: string;
    user: string;
    reactionCount: number;
    permalink: string;
}

type TallyType =
    | 'since-saved-divider'
    | 'since-given-divider'
    | 'between-given-dividers';

interface TallyResult {
    type: TallyType;
    messages: TallyMessage[];
}

export async function tallyMessages(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
): Promise<TallyResult> {
    const teamId = message.incoming_message.channelData.team_id;
    const {
        type: dividersType,
        start: dividerStart,
        end: dividerEnd,
    } = await getDividers(message.text, teamId, appStorage);

    const messages = await getMessagesDelimitedByDividers(
        bot.api!,
        dividerStart,
        dividerEnd,
        {
            channel: message.channel,
            botUserId: await appStorage.getTeamBotUser(teamId),
        }
    );

    const candidateMessages: TallyMessage[] = messages
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

    return {
        type:
            dividersType === 'saved-divider'
                ? 'since-saved-divider'
                : dividersType === 'one-given-divider'
                ? 'since-given-divider'
                : 'between-given-dividers',
        messages: candidateMessages,
    };
}

type Dividers =
    | {
          type: 'saved-divider';
          start: string;
          end: undefined;
      }
    | {
          type: 'one-given-divider';
          start: string;
          end: undefined;
      }
    | {
          type: 'two-given-dividers';
          start: string;
          end: string;
      };

// Message permalinks are of this form: https://comp3850wil.slack.com/archives/CH2PRFQDU/p1599393257001900
// The digits after `p` in the last segment are the message "id". They're the "ts" field in the API,
// but without the dot that separates the first set of digits from the last 6 digits in "ts".
// So "p1599393257001900" (permalink last segment) ==> "1599393257.001900" (ts field)
const messagePermalinkIdRegex = /https?:\/\/.*?\.slack\.com\/archives\/.*?\/p(\d*)/g;

async function getDividers(
    text: string | undefined,
    teamId: string,
    appStorage: AppStorage
): Promise<Dividers> {
    if (!text || text.trim().length === 0) {
        const divider = await appStorage.getDivider(teamId);

        if (!divider) {
            throw new BotError(BotErrorType.LAST_DIVIDER_NOT_FOUND);
        }

        return { type: 'saved-divider', start: divider, end: undefined };
    } else {
        const regexMatchToDivider = (match: RegExpMatchArray) => {
            const id = match[1];

            const divider = [
                id.slice(0, -6), // from start to before last 6 chars
                id.replace(id.slice(0, -6), ''), // last 6 chars
            ].join('.');

            return divider;
        };

        const [divider1, divider2] = Array.from(
            text.matchAll(messagePermalinkIdRegex)
        );

        if (divider1 && divider2) {
            return {
                type: 'two-given-dividers',
                start: regexMatchToDivider(divider1),
                end: regexMatchToDivider(divider2),
            };
        } else if (divider1) {
            return {
                type: 'one-given-divider',
                start: regexMatchToDivider(divider1),
                end: undefined,
            };
        } else {
            throw new BotError(BotErrorType.GIVEN_DIVIDER_NOT_FOUND);
        }
    }
}

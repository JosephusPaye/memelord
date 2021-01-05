import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker, debug } from '../bot';
import { AppStorage } from '../storage';
import { BotError, BotErrorType } from '../feedback';

let restrictAwardTo: { [key: string]: string[] } | undefined = undefined;

try {
    restrictAwardTo = JSON.parse(process.env.RESTRICT_AWARD_TO ?? '{}');
    if (restrictAwardTo) {
        Object.entries(restrictAwardTo).forEach(([teamId, value]) => {
            if (!Array.isArray(value)) {
                throw new Error(
                    `RESTRICT_AWARD_TO.${value} is not an array (should be an array of Slack user ID strings).`
                );
            }
        });
    }
} catch (err) {
    console.error('invalid RESTRICT_AWARD_TO env variable', err);
}

export async function award(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const teamId = message.incoming_message.channelData.team_id;

    // Allow only users listed in the RESTRICT_AWARD_TO env variable if it's set
    // and available for this team
    if (restrictAwardTo && restrictAwardTo[teamId] !== undefined) {
        if (restrictAwardTo[teamId].includes(message.user) === false) {
            await bot.reply(
                message,
                `I'm sorry <@${message.user}>, but I'm afraid I can't let you do that.`
            );
            return;
        }
    }

    const awardees = extractAwardees(message.text);

    appStorage.saveAward({
        teamId,
        awardees,
        awarder: message.user,
        date: new Date(),
    });

    const places = ['first', 'second', 'third'];

    const response =
        awardees.length === 1
            ? `🎉 The winner is <@${awardees[0]}>`
            : `🎉 The winners are: ${awardees
                  .slice(0, 3)
                  .map((user, i) => `<@${user}> (${places[i]})`)
                  .join(', ')}`;

    debug('award', response);

    await bot.reply(message, response);
}

// https://regexr.com/5bikn
const userMentionRegex = /(?:<@(\w+)\|[\w\.]+>)/g;

function extractAwardees(messageText: string | undefined) {
    if (!messageText) {
        throw new BotError(BotErrorType.NO_AWARDEE);
    }

    const matches = Array.from(messageText.matchAll(userMentionRegex));

    if (matches.length === 0) {
        throw new BotError(BotErrorType.NO_AWARDEE);
    }

    return matches.map((match) => {
        return match[1]; // [1] is the first capturing group, the user ID
    });
}

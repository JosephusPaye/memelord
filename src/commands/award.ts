import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker, debug } from '../bot';
import { AppStorage } from '../storage';

import { extractAwardees } from './award-support';

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

    const awardees = await extractAwardees(bot, message, appStorage);

    appStorage.saveAward({
        teamId,
        awardees,
        awarder: message.user,
        date: new Date(),
    });

    const response =
        awardees.length === 1
            ? `🎉 The winner is <@${awardees[0]}>`
            : `🎉 The winners are: ${awardeesToMessage(awardees)}`;

    debug('award', response);

    await bot.reply(message, response);
}

function awardeesToMessage(awardees: string[][]) {
    const places = ['first', 'second', 'third'];

    return awardees
        .map((users, i) => {
            return (
                users
                    .map((user) => {
                        return `<@${user}>`;
                    })
                    .join(', ') + ` (${places[i]})`
            );
        })
        .join(', ');
}

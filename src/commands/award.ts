import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker, debug } from '../bot';
import { AppStorage } from '../storage';
import { BotError, BotErrorType } from '../feedback';

export async function award(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const teamId = message.incoming_message.channelData.team_id;

    if(!appStorage.getAdmin(teamId,message.user)){
        return
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
            ? `🎉 <@${message.user}> awarded <@${awardees[0]}>`
            : `🎉 <@${message.user}> awarded: ${awardees
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

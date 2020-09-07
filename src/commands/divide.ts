import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker, debug } from '../bot';
import { AppStorage } from '../storage';
import { MESSAGES } from '../feedback';

export async function divide(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const { id } = await bot.reply(message, MESSAGES.DIVIDER);

    const divider = {
        teamId: message.team_id,
        dividerMessageId: id,
    };

    await appStorage.saveDivider(divider);

    debug('saved divider:', divider);
}

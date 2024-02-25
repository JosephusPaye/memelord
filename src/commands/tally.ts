import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker, debug } from '../bot';
import { AppStorage } from '../storage';
import { fetchAndAttachPermalinks } from '../api';
import { tallyMessages } from './tally-support';

export async function tally(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const { type, messages: allCandidates } = await tallyMessages(
        bot,
        message,
        appStorage
    );

    const topCandidates = allCandidates.slice(0, 10);

    await fetchAndAttachPermalinks<{ ts: string; permalink: string }>(
        topCandidates,
        message.channel,
        bot.api!
    );

    const tally = topCandidates.map((candidate, i) => {
        return `${i + 1}. <${candidate.permalink}|Post> by <@${
            candidate.user
        }>: *${candidate.reactionCount}* ${
            candidate.reactionCount === 1 ? 'reaction' : 'reactions'
        }`;
    });

    const hasSurplusCandidates = allCandidates.length > 10;

    const aboutDivider =
        type === 'since-saved-divider'
            ? 'since the last divider'
            : type === 'since-given-divider'
            ? 'since the given divider'
            : 'between the given dividers';

    const reply =
        tally.length > 0
            ? `📊 ${
                  hasSurplusCandidates ? 'Top 10 posts' : 'Tally of posts'
              } ${aboutDivider}:\n${tally.join('\n')}`
            : `No posts with reactions ${aboutDivider}.`;

    debug('tally', reply);

    await bot.say(reply);
}

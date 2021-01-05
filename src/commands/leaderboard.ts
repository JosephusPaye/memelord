import { BotkitMessage } from 'botkit';

import { SlackBotkitWorker, debug } from '../bot';
import { AppStorage } from '../storage';

interface AwardCounts {
    firsts: number;
    seconds: number;
    thirds: number;
}

export async function leaderboard(
    bot: SlackBotkitWorker,
    message: BotkitMessage,
    appStorage: AppStorage
) {
    const teamId = message.incoming_message.channelData.team_id;
    const awardsCursor = await appStorage.getAwards(teamId);

    const tally = new Map<string, AwardCounts>();

    while (await awardsCursor.hasNext()) {
        const award = await awardsCursor.next();

        if (!award) {
            break;
        }

        for (let i = 0; i < award.awardees.length; i++) {
            // .awardees[i] may be a string or an array of strings
            const users = ([] as string[]).concat(award.awardees[i]);

            for (const user of users) {
                const userTally = tally.get(user) ?? {
                    firsts: 0,
                    seconds: 0,
                    thirds: 0,
                };

                if (i === 0) {
                    userTally.firsts++;
                } else if (i === 1) {
                    userTally.seconds++;
                } else if (i === 2) {
                    userTally.thirds++;
                } else {
                    debug(
                        'awardees beyond the first three are not included in leaderboards',
                        teamId,
                        award
                    );
                }

                tally.set(user, userTally);
            }
        }
    }

    awardsCursor.close();

    const entries = Array.from(tally.entries())
        .sort(([, awardsA], [, awardsB]) => {
            if (awardsA.firsts > awardsB.firsts) {
                return -1;
            } else if (awardsA.firsts < awardsB.firsts) {
                return 1;
            }

            if (awardsA.seconds > awardsB.seconds) {
                return -1;
            } else if (awardsA.seconds < awardsB.seconds) {
                return 1;
            }

            if (awardsA.thirds > awardsB.thirds) {
                return -1;
            } else if (awardsA.thirds < awardsB.thirds) {
                return 1;
            }

            return 0;
        })
        .map(([user, awards], i) => {
            return `${i + 1}. <@${user}>: *${awards.firsts}* ${
                awards.firsts === 1 ? 'first' : 'firsts'
            }, *${awards.seconds}* ${
                awards.seconds === 1 ? 'second' : 'seconds'
            }, *${awards.thirds}* ${awards.thirds === 1 ? 'third' : 'thirds'}`;
        });

    const response =
        entries.length > 0
            ? ['🏆 Leaderboard 🏆', ...entries].join('\n')
            : 'No winners awarded yet.';

    debug('leaderboard', response);

    await bot.reply(message, response);
}

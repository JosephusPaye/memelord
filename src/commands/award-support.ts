import { BotError, BotErrorType } from '../feedback';

// https://regexr.com/5bikn
const userMentionRegex = /(?:<@(\w+)\|[\w\.]+>)/g;

export function extractAwardees(messageText: string | undefined) {
    if (!messageText) {
        throw new BotError(BotErrorType.NO_AWARDEE);
    }

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

    if (places.length === 0) {
        throw new BotError(BotErrorType.NO_AWARDEE);
    }

    return places;
}

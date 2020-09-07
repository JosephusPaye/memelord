import { WebClient, WebAPICallResult } from '@slack/web-api';
import { BotError, BotErrorType } from './feedback';

export interface SlackReaction {
    name: string;
    users: string[];
    count: number;
}

export interface SlackMessage {
    bot_id?: string;
    type: string;
    text: string;
    user: string;
    ts: string;
    team: string;
    bot_profile?: unknown;
    blocks?: unknown[];
    reactions?: SlackReaction[];
}

async function getNextPage(
    previousResult: WebAPICallResult,
    api: WebClient,
    fetchNextResults: (
        previousResult: WebAPICallResult
    ) => Promise<WebAPICallResult>,
    handleResult: (result: WebAPICallResult) => void
) {
    if (!previousResult.has_more) {
        return;
    }

    const result = await fetchNextResults(previousResult);
    assertApiResultOK(result);

    handleResult(result);

    if (result.has_more) {
        getNextPage(result, api, fetchNextResults, handleResult);
    }
}

function assertApiResultOK(result: WebAPICallResult) {
    if (!result.ok) {
        throw new BotError(BotErrorType.API_ERROR);
    }
}

export async function getMessagesSinceDivider(
    api: WebClient,
    divider: string,
    data: { channel: string; botUserId: string }
): Promise<SlackMessage[]> {
    const query = {
        channel: data.channel,
        oldest: divider,
        inclusive: true,
    };

    const result = await api.conversations.history(query);
    assertApiResultOK(result);

    const initialMessages = result.messages as SlackMessage[];

    // The oldest message (last in the list) will be the divider,
    // otherwise no divider was found.
    if (
        initialMessages.length === 0 ||
        initialMessages[initialMessages.length - 1].ts !== divider
    ) {
        throw new BotError(BotErrorType.LAST_DIVIDER_NOT_FOUND);
    }

    const messages = initialMessages.slice(0, -1); // removes the divider

    await getNextPage(
        result,
        api,
        (previousResult: WebAPICallResult) => {
            return api.conversations.history(
                Object.assign({}, query, {
                    cursor: previousResult.response_metadata?.next_cursor,
                })
            );
        },
        (result: WebAPICallResult) => {
            messages.push(...(result.messages as SlackMessage[]));
        }
    );

    // Remove messages by the bot
    return messages.filter((message) => message.user !== data.botUserId);
}

export async function fetchAndAttachPermalinks<
    T extends { ts: string; permalink: string }
>(messages: T[], channel: string, api: WebClient) {
    // Fetch and attach the permalinks 4 messages at a time
    await chunk<T>(messages, 4, (someMessages: T[]) => {
        return Promise.all(
            someMessages.map((message) => {
                return api.chat
                    .getPermalink({
                        channel,
                        message_ts: message.ts,
                    })
                    .then((result) => {
                        assertApiResultOK(result);
                        message.permalink = result.permalink as string;
                    });
            })
        );
    });
}

export async function chunk<T>(
    array: T[],
    chunkSize: number,
    processChunk: (currentChunk: T[]) => Promise<unknown>
) {
    const chunks = Math.ceil(array.length / chunkSize);

    for (let i = 0; i < chunks; i++) {
        const offset = i * chunkSize;
        await processChunk(array.slice(offset, offset + chunkSize));
    }
}

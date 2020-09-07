export const MESSAGES = {
    DIVIDER: '➡➡➡ DIVIDER 🔶 DIVIDER 🔵 DIVIDER 🔶 DIVIDER ⬅⬅⬅',
};

export enum BotErrorType {
    API_ERROR = 'API_ERROR',
    LAST_DIVIDER_NOT_FOUND = 'LAST_DIVIDER_NOT_FOUND',
    GIVEN_DIVIDER_NOT_FOUND = 'GIVEN_DIVIDER_NOT_FOUND',
}

export class BotError extends Error {
    type: BotErrorType;

    constructor(type: BotErrorType, message?: string) {
        super(message);
        this.type = type;
    }

    toString() {
        switch (this.type) {
            case BotErrorType.API_ERROR:
                return `⚠ Slack API request failed. Error: ${this.message}`;
            case BotErrorType.LAST_DIVIDER_NOT_FOUND:
                return '⚠ No divider found. If you have a manually created divider message, type `/tally <message link>` to use that message as the divider.';
            case BotErrorType.GIVEN_DIVIDER_NOT_FOUND:
                return '⚠ Given divider message not found. Check the message link and try again.';
        }
    }
}

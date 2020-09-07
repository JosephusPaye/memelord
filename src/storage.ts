import { MongoClient, Db } from 'mongodb';
import { MongoDbStorage } from 'botbuilder-storage-mongodb/MongoDbStorage';

import { debug } from './bot';

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI env variable is required for storage');
    process.exit();
}

export interface TeamAccessToken {
    teamId: string;
    teamName: string;
    /**
     * The channel name, e.g. #random
     */
    channel: string;
    /**
     * The channel id
     */
    channelId: string;
    accessToken: string;
}

export interface TeamBotUser {
    teamId: string;
    botUserId: string;
}

export interface Divider {
    teamId: string;
    dividerMessageId: string;
}

export interface Award {
    teamId: string;
    date: Date;
    awardees: string[];
}

export type TeamScopedData = TeamAccessToken | TeamBotUser | Divider;

type UnPromisify<T> = T extends Promise<infer U> ? U : T;

export type AppStorage = UnPromisify<ReturnType<typeof createAppStorage>>;

export type AdapterStorage = MongoDbStorage;

export async function createStorage() {
    const mongoClient = new MongoClient(process.env.MONGO_URI!, {
        useUnifiedTopology: true,
    });

    await mongoClient.connect();

    // Create 'adapter' storage for the Botbuilder framework
    const collection = MongoDbStorage.getCollection(
        mongoClient,
        'MemeLordBotBuilder'
    );
    const adapterStorage = new MongoDbStorage(collection);

    // Create storage (db) that we use only in the app
    const appDb = mongoClient.db('MemeLordApp');
    const appStorage = await createAppStorage(appDb);

    return { adapterStorage, appStorage };
}

async function createAppStorage(appDb: Db) {
    const teamAccessTokens = await createTeamAccessTokensCollection(appDb);
    const teamBotUsers = await createTeamBotUsersCollection(appDb);
    const dividers = await createDividersCollection(appDb);
    const awards = await createAwardsCollection(appDb);

    return { ...teamAccessTokens, ...teamBotUsers, ...dividers, ...awards };
}

async function createTeamAccessTokensCollection(appDb: Db) {
    const TeamAccessTokens = appDb.collection<TeamAccessToken>(
        'TeamAccessTokens'
    );
    await TeamAccessTokens.createIndex({ teamId: 1 }, { unique: true });

    async function saveTeamAccessToken(data: TeamAccessToken) {
        await TeamAccessTokens.replaceOne(
            { teamId: data.teamId },
            data,
            { upsert: true } // Insert or update
        );
    }

    async function getTeamAccessToken(teamId: string) {
        debug('getting access token for team', teamId);

        const result = await TeamAccessTokens.findOne({
            teamId,
        });

        if (!result) {
            console.error('team not found in token store:', teamId);
        }

        return result ? result.accessToken : '';
    }

    return { TeamAccessTokens, saveTeamAccessToken, getTeamAccessToken };
}

async function createTeamBotUsersCollection(appDb: Db) {
    const TeamBotUsers = appDb.collection<TeamBotUser>('TeamBotUsers');
    await TeamBotUsers.createIndex({ teamId: 1 }, { unique: true });

    async function saveTeamBotUser(data: TeamBotUser) {
        await TeamBotUsers.replaceOne(
            { teamId: data.teamId },
            data,
            { upsert: true } // Insert or update
        );
    }

    async function getTeamBotUser(teamId: string) {
        debug('getting bot user for team', teamId);

        const result = await TeamBotUsers.findOne({
            teamId,
        });

        if (!result) {
            console.error('team bot user not found in token store:', teamId);
        }

        return result ? result.botUserId : '';
    }

    return { TeamBotUsers, saveTeamBotUser, getTeamBotUser };
}

async function createDividersCollection(appDb: Db) {
    const Dividers = appDb.collection<Divider>('Dividers');
    await Dividers.createIndex({ teamId: 1 }, { unique: true });

    async function saveDivider(data: Divider) {
        await Dividers.replaceOne(
            { teamId: data.teamId },
            data,
            { upsert: true } // Insert or update
        );
    }

    async function getDivider(teamId: string) {
        debug('getting last divider for team', teamId);

        const result = await Dividers.findOne({
            teamId,
        });

        if (!result) {
            console.error(
                'divider not found for team in divider store:',
                teamId
            );
        }

        return result ? result.dividerMessageId : '';
    }

    return { Dividers, saveDivider, getDivider };
}

async function createAwardsCollection(appDb: Db) {
    const Awards = appDb.collection<Award>('Awards');
    await Awards.createIndex({ teamId: 1 });

    async function saveAward(data: Award) {
        await Awards.insertOne(data);
    }

    async function getAwards(teamId: string) {
        debug('getting awards for team', teamId);

        return Awards.find({
            teamId,
        }, { timeout: false });
    }

    return { Awards, saveAward, getAwards };
}

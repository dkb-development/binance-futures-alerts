import { getDBConnectionDetails } from '../configs/DBConfig.js';
const PatternCHeckCollectionName = "TrackedSymbols";

export const getAllTrackedSymbols = async () => {
    var {client, database, collection} = await getDBConnectionDetails(PatternCHeckCollectionName);
    return await collection.find({}).toArray();
}


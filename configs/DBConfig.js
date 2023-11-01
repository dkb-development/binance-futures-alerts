// DB Connection
import { MongoClient, ServerApiVersion } from 'mongodb';
import { getDBConnections, setDBConnection } from '../localStorage1.js';

const uri = "mongodb+srv://dkb01development:binance-futures-alerts@alerts.mgeiq18.mongodb.net/?retryWrites=true&w=majority";
export const DB_NAME = "BinanceFuturesAlerts";
export const COLLECTION_NAME = "PriceAlerts";
export const PATTERN_CHECK_COLLECTION_NAME = "TrackedSymbols";

export const connectToMongoDB = async() => {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    const client = new MongoClient(uri, {
        serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
        }
    });
  
    try {
        if(!client){
            await client.connect();
            console.log('Connected to MongoDB Atlas');
        }
        return client;
    } catch (error) {
      console.error('Error connecting to MongoDB Atlas:', error);
      throw error;
    }
};

export const getDBConnectionDetails = async (givenCollectionName) => {
    try{
        var dbConnection = getDBConnections();
        var client, database, collection;
        if(dbConnection != null){
            if(dbConnection[givenCollectionName]){
                ({client, database, collection} = dbConnection[givenCollectionName]);
                return {
                    client, database, collection
                };
            }
        }
        else{
            dbConnection = {};
        }
        if(!client || !database || !collection){
            client = await connectToMongoDB();
            database = client.db(DB_NAME); // Replace with your database name
            collection = database.collection(givenCollectionName);
            console.log("MongoDB connected Successfully. !!!");
            console.log(`DB_NAME : ${DB_NAME} , COLLECTION_NAME : ${givenCollectionName}`);
        
            // Setting the dbConnection details in localStorage
            dbConnection[givenCollectionName] = {client, database, collection};
            setDBConnection(dbConnection);
        }
        return {
            client, database, collection
        };
    }
    catch(error){
        console.error("Error in DB Connection : ", error);
    }
    
}
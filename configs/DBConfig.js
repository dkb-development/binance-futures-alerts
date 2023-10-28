// DB Connection
import { MongoClient, ServerApiVersion } from 'mongodb';
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
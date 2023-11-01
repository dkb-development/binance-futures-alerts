import {DB_NAME,PATTERN_CHECK_COLLECTION_NAME as COLLECTION_NAME , connectToMongoDB} from '../configs/DBConfig.js';
import {sendDuplicateAlertMessage} from './TelegramMessageService.js';
import { getDBConnectionDetails as getDBConnection } from '../configs/DBConfig.js';

var client, database, collection;


export const getDBConnectionDetails = async () => {
    try{
        if(!client || !database || !collection){
            client = await connectToMongoDB();
            database = client.db(DB_NAME); // Replace with your database name
            collection = database.collection(COLLECTION_NAME);
            console.log("MongoDB connected Successfully. !!!");
            console.log(`DB_NAME : ${DB_NAME} , COLLECTION_NAME : ${COLLECTION_NAME}`);
        }
        return {
            client, database, collection
        };
    }
    catch(error){
        console.error("Error in DB Connection : ", error);
    }
    
}

export const InsertIntoAlertsTable = async (msg) => {
    var messageText = msg.text;
    var splits = messageText.split("\n");
    if(splits.length != 3){
        return;
    }
    var symbol = splits[0].toUpperCase();
    var price = parseFloat(splits[1]);
    var position = splits[2].toUpperCase();
    if(symbol && price && position){
        console.log("New Trigger Entry came : ", symbol, price, position);

        // Insert into the DB
        try{
            const {client, database, collection} = await getDBConnectionDetails();
            
            // Check whether the same entry already present in the DB
            const inDB = await collection.findOne({
                symbol: symbol,
                target_price: price,
                trigger_status: "PENDING",
                trigger_position: position
            });
            if(inDB){
                sendDuplicateAlertMessage(msg);
                return;
            }

            // If not present then insert into the DB
            const result = await collection.insertOne({
                symbol: symbol,
                target_price: price,
                trigger_status: "PENDING",
                trigger_position: position
            });
            console.log(`Successfully inserted to the DB: ${result.insertedId}`);
        }
        catch(error){
            console.error("Error Occured while inserting into the DB. ", error);
        }
    }
}

export const DeleteFromAlertsTable = async (messageText) => {
    var splits = messageText.split("\n");
    if(splits.length != 3){
        return;
    }
    var symbol = splits[0].toUpperCase();
    var price = parseFloat(splits[1]);
    var position = splits[2].toUpperCase();
    if(symbol && price && position){
        console.log("Entry to be deleted : ", symbol, price, position);

        // Insert into the DB
        try{
            const {client, database, collection} = await getDBConnectionDetails();

            // Use deleteOne to delete a single document
            const result = await collection.deleteOne({
                symbol: symbol,
                target_price: price,
                trigger_position: position
            });

            if (result.deletedCount === 1) {
                console.log('Document deleted successfully');
            } else {
                console.log('Document not found');
            }
        }
        catch(error){
            console.error("Error Occured while deleting the entry. ", error);
        }
    }
} 

export const UpdatePendingToCompleted = async (alertDetails) => {
    try {
        const {client, database, collection} = await getDBConnectionDetails();

        const result = await collection.updateOne({
            _id: alertDetails._id,
        }, { $set: {
            trigger_status: "COMPLETED"
        } });
    } catch (error) {
        console.error("Error during update Table from PENDING to COMPLETED : ", error);
    }
}

async function findDocumentsByProperty(client, collectionName, propertyName, propertyValue) {
    try {
      const database = client.db(DB_NAME); // Replace with your database name
      const collection = database.collection(collectionName);
  
      const query = {
        [propertyName]: propertyValue,
      };
  
      const result = await collection.find(query).toArray();
      
    //   console.log(`Documents with ${propertyName}=${propertyValue}:`);
    //   console.log(result);
  
      return result;
    } catch (error) {
      console.error('Error finding documents:', error);
    }
}

export const getAllTrackedSymbols = async (givenCollectionName) => {
    var {client, database, collection} = getDBConnection(givenCollectionName);
    return await collection.find({}).toArray();
}

export const addTrackedSymbols = async (symbolsDetails) => {
    // Insert into the DB
    try{
        const {client, database, collection} = await getDBConnectionDetails();

        symbolsDetails.forEach(async symbolDetails => {
            // Check whether the same entry already present in the DB
            const inDB = await collection.findOne({
                symbol: symbolDetails.symbol,
                interval: symbolDetails.interval
            });
            if(inDB){
                return;
            }

            // If not present then insert into the DB
            const result = await collection.insertOne({
                symbol: symbolDetails.symbol,
                interval: symbolDetails.interval
            });
            console.log(`Successfully inserted to the DB: ${result.insertedId}`);
        });
        
        
    }
    catch(error){
        console.error("Error Occured while inserting into the DB. ", error);
    }
}

export const deleteTrackedSymbols = async (symbolsDetails) => {
    // Insert into the DB
    try{
        const {client, database, collection} = await getDBConnectionDetails();

        var deletedSymbols = [];
        const promises = symbolsDetails.map(async symbolDetails => {
            // Delete from the DB
            const result = await collection.deleteOne({
                symbol: symbolDetails.symbol,
                interval: symbolDetails.interval
            });
            if (result.deletedCount === 1) {
                deletedSymbols.push(symbolDetails);
                console.log('Document deleted successfully');
            } else {
                console.log('Document not found');
            }
        });

        // Use Promise.all to wait for all promises to resolve
        await Promise.all(promises);

        return deletedSymbols;
        
    }
    catch(error){
        console.error("Error Occured while inserting into the DB. ", error);
    }
}

export const deleteAllTrackedSymbols = async () => {
    // Insert into the DB
    try{
        const {client, database, collection} = await getDBConnectionDetails();

        // Use deleteOne to delete a single document
        const result = await collection.deleteMany({
        });

        return result.deletedCount;
    }
    catch(error){
        console.error("Error Occured while deleting the entry. ", error);
    }
}
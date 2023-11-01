import { getDBConnectionDetails } from '../configs/DBConfig.js';

const givenCollectionName = "PriceAlerts";

export const InsertIntoAlertsTable = async (symbolDetails) => {
    var {symbol , target_price : price , trigger_direction : direction} = symbolDetails;
    if(symbol && price && direction){
        console.log("New Trigger Entry came : ", symbol, price, direction);

        // Insert into the DB
        try{
            const {client, database, collection} = await getDBConnectionDetails(givenCollectionName);
            
            // Check whether the same entry already present in the DB
            const inDB = await collection.findOne({
                symbol: symbol,
                target_price: price,
                trigger_status: "PENDING",
                trigger_direction: direction
            });
            if(inDB){
                return -1;
            }

            // If not present then insert into the DB
            const result = await collection.insertOne({
                symbol: symbol,
                target_price: price,
                trigger_status: "PENDING",
                trigger_direction: direction
            });
            console.log(`Successfully inserted to the DB: ${result.insertedId}`);
            return 1;
        }
        catch(error){
            console.error("Error Occured while inserting into the DB. ", error);
            return -1;
        }
    }
}

// export const DeleteFromAlertsTable = async (messageText) => {
//     var splits = messageText.split("\n");
//     if(splits.length != 3){
//         return;
//     }
//     var symbol = splits[0].toUpperCase();
//     var price = parseFloat(splits[1]);
//     var position = splits[2].toUpperCase();
//     if(symbol && price && position){
//         console.log("Entry to be deleted : ", symbol, price, position);

//         // Insert into the DB
//         try{
//             const {client, database, collection} = await getDBConnectionDetails();

//             // Use deleteOne to delete a single document
//             const result = await collection.deleteOne({
//                 symbol: symbol,
//                 target_price: price,
//                 trigger_position: position
//             });

//             if (result.deletedCount === 1) {
//                 console.log('Document deleted successfully');
//             } else {
//                 console.log('Document not found');
//             }
//         }
//         catch(error){
//             console.error("Error Occured while deleting the entry. ", error);
//         }
//     }
// } 

// export const UpdatePendingToCompleted = async (alertDetails) => {
//     try {
//         const {client, database, collection} = await getDBConnectionDetails();

//         const result = await collection.updateOne({
//             _id: alertDetails._id,
//         }, { $set: {
//             trigger_status: "COMPLETED"
//         } });
//     } catch (error) {
//         console.error("Error during update Table from PENDING to COMPLETED : ", error);
//     }
// }

// async function findDocumentsByProperty(client, collectionName, propertyName, propertyValue) {
//     try {
//       const database = client.db(DB_NAME); // Replace with your database name
//       const collection = database.collection(collectionName);
  
//       const query = {
//         [propertyName]: propertyValue,
//       };
  
//       const result = await collection.find(query).toArray();
      
//     //   console.log(`Documents with ${propertyName}=${propertyValue}:`);
//     //   console.log(result);
  
//       return result;
//     } catch (error) {
//       console.error('Error finding documents:', error);
//     }
// }

// export const getPendingAlerts = async () => {
//     return await findDocumentsByProperty(client, COLLECTION_NAME, 'trigger_status', 'PENDING');
// }
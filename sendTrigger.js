import TelegramBot from 'node-telegram-bot-api';
import {DB_NAME,COLLECTION_NAME , connectToMongoDB} from './DBConfig.js';

// replace 'YOUR_BOT_TOKEN' with the token you got from BotFather
var YOUR_BOT_TOKEN = '5628374625:AAHAdp-0tkILf8s869lGusF17PG4LR6-_CA';
const bot = new TelegramBot(YOUR_BOT_TOKEN, { polling: true });

// Getting DB Connection
var client = await connectToMongoDB();
var database = client.db(DB_NAME); // Replace with your database name
var collection = database.collection(COLLECTION_NAME);


// Listen for incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // console.log(msg.reply_to_message);
    if(msg.text.toUpperCase() == "DEL" || msg.text.toUpperCase()=="DELETE"){
        if(msg.reply_to_message && msg.reply_to_message.text){
            DeleteFromDB(msg.reply_to_message.text);
        }
    }
    else{
        InsertIntoDB(msg);
    }
    
});

const InsertIntoDB = async (msg) => {
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
            if(!client){
                client = await connectToMongoDB();
                database = client.db(DB_NAME); // Replace with your database name
                collection = database.collection(COLLECTION_NAME);
            }
            
            // Check whether the same entry already present in the DB
            const inDB = await collection.findOne({
                symbol: symbol,
                target_price: price,
                trigger_status: "PENDING",
                trigger_position: position
            });
            if(inDB){
                bot.sendMessage(msg.chat.id, "Same Alert already exists.",{
                    reply_to_message_id: msg.message_id,
                  });
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

const DeleteFromDB = async (client, DB_NAME, COLLECTION_NAME, messageText) => {
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
            if(!client){
                client = await connectToMongoDB();
                database = client.db(DB_NAME); // Replace with your database name
                collection = database.collection(COLLECTION_NAME);
            }
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

// Handle errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// replace 'YOUR_CHAT_ID' with the chat ID where you want to send the message
const chatId = '-4086004522';

// the message you want to send
const text = 'Trigger';

export const SendPriceAlerts = async (alertDetails) => {
    var message = `!!!ALERT!!!\n\nPrice Triggered\n\n${alertDetails.symbol}\n ${alertDetails.target_price} - ${alertDetails.trigger_position}`;
    sendAlert(message);

    // Make complete in DB
    if(!client){
        client = await connectToMongoDB();
        const database = client.db(DB_NAME); // Replace with your database name
        const collection = database.collection(COLLECTION_NAME);
    }
    const result = await collection.updateOne({
        _id: alertDetails._id,
    }, { $set: {
        trigger_status: "COMPLETED"
    } });
}

const sendAlert = (message) => {
    bot.sendMessage(chatId, message);
}

// send the message
// bot.sendMessage(chatId, text);

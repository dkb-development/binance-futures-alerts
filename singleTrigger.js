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

const DeleteFromDB = async (messageText) => {
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

// import { SendPriceAlerts } from "./sendTrigger.js";
// import { binance } from './BinanceConfig.js';
import WebSocket from 'ws';
// import {DB_NAME, COLLECTION_NAME} from './DBConfig.js';

// Binance API key information
import { BinanceApiKey, BinanceApiSecret } from "./BinanceConfig.js";
const apiKey = BinanceApiKey;
const apiSecret = BinanceApiSecret;


// DB Connection
// import {connectToMongoDB} from './DBConfig.js';

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
  
var currentAlerts = {};
  // Usage example
async function main() {
    console.log("Inside Main");
    const client = await connectToMongoDB();
    
    // Fetch Pending alerts from DB
    var entries = await findDocumentsByProperty(client, COLLECTION_NAME, 'trigger_status', 'PENDING');
    const alertSymbols = entries.map(entry => {
        return entry.symbol;
    });
    startWebSocketForAllSymbols(alertSymbols);
    currentAlerts = entries;

    // Delete the unwanted symbols
    const socketSymbols = Object.keys(wsInstances);
    const removableSymbols = socketSymbols.filter((symbol) => !alertSymbols.includes(symbol));
    removableSymbols.forEach((symbol) => {
        closeWebSocket(symbol);
    })


    await client.close();
}

main();
setInterval(() => {
    main();
},30000); // Runs every 5 minutes => 5*60*100 = 30,000



// Binance WebSocket base URL
const wsBaseUrl = 'wss://fstream.binance.com/ws/';

var wsInstances = {};

// Function to create a WebSocket connection for a given symbol
const createWebSocket = (symbol) => {
    if(wsInstances[symbol]){
        return;
    }
    console.log("New Symbol came : ", symbol);

    const wsEndpoint = `${wsBaseUrl}${symbol.toLowerCase()}@kline_1m`;
    const ws = new WebSocket(wsEndpoint);

    ws.on('open', () => {
        console.log(`WebSocket Connection Opened for ${symbol}`);
    });

    ws.on('message', (data) => {
        const parsedData = JSON.parse(data);
        if (parsedData.k && parsedData.k.x) {
            handleKlineData(parsedData, symbol);
        }
    });

    ws.on('close', () => {
        console.log(`WebSocket Connection Closed for ${symbol}`);
        // You might want to handle reconnection logic here
    });

    wsInstances[symbol] = ws;
    return ws;
};

const closeWebSocket = (symbol) => {
  if (wsInstances[symbol]) {
    wsInstances[symbol].close();
    console.log(`WebSocket Connection Closed for ${symbol}`);
    delete wsInstances[symbol];
  } else {
    console.log(`WebSocket for ${symbol} not found`);
  }
}

// Function to handle Kline/Candlestick data
const handleKlineData = (kline, symbol) => {
    let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = kline.k;
    if(isFinal){
        console.info(symbol+" "+interval+" candlestick update");
        console.info("open: "+open);
        console.info("high: "+high);
        console.info("low: "+low);
        console.info("close: "+close);
        console.info("volume: "+volume);
        console.info("isFinal: "+isFinal);
        console.info("Time: ", new Date().toLocaleString());
        console.log('-----------------------------');
        // console.log(kline.k);

        var candle = {
            symbol, interval, open: parseFloat(open), high: parseFloat(high), low: parseFloat(low), close: parseFloat(close), volume: parseFloat(volume)
        }
        checkTrigger(candle);
    }
};

// Function to start WebSocket connections for all symbols
const startWebSocketForAllSymbols = (symbols) => {
    // const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', /* Add more symbols as needed */];

    const websockets = symbols.map((symbol) => createWebSocket(symbol));
    // setTimeout(() => {
    //     closeWebSocket("BTCUSDT");
    // }, 60000);
  
};

// startWebSocketForAllSymbols();

const checkTrigger = (candle) => {
    const {symbol, interval, open, high, low, close, volume} = candle;
    var symbolALerts = currentAlerts.filter((alert) => alert.symbol == symbol);
    
    symbolALerts.forEach((alertDetails) => {
        console.log("Checking Alert Details ");
        // console.log(alertDetails);

        const triggerPosition = alertDetails.trigger_position;
        const triggerPrice = parseFloat(alertDetails.target_price);

        console.log(triggerPosition, triggerPrice);
        switch(triggerPosition){
            case "DOWN":
                parseFloat(low) < triggerPrice ? SendPriceAlerts(alertDetails) : null;
                break;
            case "UP":
                high > triggerPrice ? SendPriceAlerts(alertDetails) : null;
                break;
            default:
                break;

        }

    })
}

const sendTrigger = () => {

}

import TelegramBot from 'node-telegram-bot-api';
import {UpdatePendingToCompleted} from './PriceAlertsDBService.js';
import { InsertIntoAlertsTable, DeleteFromAlertsTable } from './PriceAlertsDBService.js';
import {addTrackedSymbols, getAllTrackedSymbols, deleteAllTrackedSymbols, deleteTrackedSymbols} from './PatternCheckDBService.js';
import { handleNewEntry } from '../server.js';
import { startPatternCheck } from './PatternCheckService.js';

const BOT_TOKEN = '5628374625:AAHAdp-0tkILf8s869lGusF17PG4LR6-_CA';
const chatId = '-4086004522';

var bot=undefined;
export const createMessageTelegramBot = () => {
    if(bot === undefined){
        bot = new TelegramBot(BOT_TOKEN, { polling: true });

        // Listen for incoming messages
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const messageText = msg.text;

            // console.log(msg.reply_to_message);
            if(msg.text.toUpperCase() == "DEL" || msg.text.toUpperCase()=="DELETE"){
                if(msg.reply_to_message && msg.reply_to_message.text){
                    DeleteFromAlertsTable(msg.reply_to_message.text);
                    await handleNewEntry();
                }
            }
            else{
                handleInputMessage(msg);
                // await InsertIntoAlertsTable(msg);
                // await handleNewEntry();
            }
            
        });

        // Handle errors
        bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        console.log("Telegram bot created Successfully. !!!");

    }

    return bot;
}

const handleInputMessage = async (msg) => {
    console.log("Inside handle telegram message");
    var messageText = msg.text;
    var splits = messageText.split("\n");
    if(splits.length == 3){
        await InsertIntoAlertsTable(msg);
        await handleNewEntry();
        return;
    }

    if(messageText.includes("/patAdd")){
        var symbolsDetails = getPatSymbols(messageText);

        // Insert into the table
        await addTrackedSymbols(symbolsDetails);
        // console.log(symbolsDetails);

        // Call the Patterncheck service
        await startPatternCheck();

        // Send Reply message
        var symbolsDict = {};
        symbolsDetails.forEach(symbolDetails => {
            if(symbolsDict[symbolDetails.symbol]){
                symbolsDict[symbolDetails.symbol].push(symbolDetails.interval)
            }
            else{
                symbolsDict[symbolDetails.symbol] = [symbolDetails.interval];
            }
        });

        var messageText = "Symbols added for Tracking \n\n";
        Object.keys(symbolsDict).forEach(key => {
            messageText += key + " - " + symbolsDict[key]+"\n";
        });

        var currBot = createMessageTelegramBot();
        currBot.sendMessage(msg.chat.id, messageText,{
            reply_to_message_id: msg.message_id,
        });
    }
    else if(messageText.includes("/patGetAll")){
        var symbolsDetails = await getAllTrackedSymbols();
        
        // Sort the symbol details
        // symbolsDetails.sort((a,b) => a.symbol > b.symbol ? 1 : a.symbol==b.symbol ? a.interval - b.interval : -1);

        var symbolsDict = {};
        symbolsDetails.forEach(symbolDetails => {
            if(symbolsDict[symbolDetails.symbol]){
                symbolsDict[symbolDetails.symbol].push(symbolDetails.interval)
            }
            else{
                symbolsDict[symbolDetails.symbol] = [symbolDetails.interval];
            }
        });

        var messageText = "";
        Object.keys(symbolsDict).forEach(key => {
            messageText += key + " - " + symbolsDict[key]+"\n";
        });

        // Send Reply message
        var currBot = createMessageTelegramBot();
        currBot.sendMessage(msg.chat.id, messageText,{
            reply_to_message_id: msg.message_id,
        });
    }
    else if(messageText.includes("/patDelAll")){
        var deletedSymbolCount = await deleteAllTrackedSymbols();

        // Send Reply message
        var messageText = `${deletedSymbolCount} entries deleted from Tracking Successfully`;
        var currBot = createMessageTelegramBot();
        currBot.sendMessage(msg.chat.id, messageText,{
            reply_to_message_id: msg.message_id,
        });
    }
    else if(messageText.includes("/patDel")){
        var symbolsDetails = getPatSymbols(messageText);

        // Insert into the table
        var deletedSymbolsDetails = await deleteTrackedSymbols(symbolsDetails);
        console.log(deletedSymbolsDetails);

        // Send Reply message
        if(deletedSymbolsDetails && deletedSymbolsDetails != -1){
            var symbolsDict = {};
            deletedSymbolsDetails.forEach(symbolDetails => {
                if(symbolsDict[symbolDetails.symbol]){
                    symbolsDict[symbolDetails.symbol].push(symbolDetails.interval)
                }
                else{
                    symbolsDict[symbolDetails.symbol] = [symbolDetails.interval];
                }
            });

            var messageText = "Symbols Deleted from Tracking \n\n";
            Object.keys(symbolsDict).forEach(key => {
                messageText += key + " - " + symbolsDict[key]+"\n";
            });

            var currBot = createMessageTelegramBot();
            currBot.sendMessage(msg.chat.id, messageText,{
                reply_to_message_id: msg.message_id,
            });
        }
        
    }
}

const getPatSymbols = (message) => {
    var splits = message.split(" ");
    var symbols = [];
    for(let i=1;i<splits.length;i++){
        symbols.push(splits[i].toUpperCase());
    }

    var symbolsDetails = [];
    symbols.forEach(symbol => {
        symbolsDetails.push({
            symbol,
            interval: "1m"
        });
        symbolsDetails.push({
            symbol,
            interval: "5m"
        });
    })
    return symbolsDetails;
}

export const sendDuplicateAlertMessage = (msg) => {
    createMessageTelegramBot();
    bot.sendMessage(msg.chat.id, "Same Alert already exists.",{
        reply_to_message_id: msg.message_id,
      });
}

export const SendPriceAlerts = async (alertDetails) => {
    var message = `!!!ALERT!!!\n\nPrice Triggered\n\n${alertDetails.symbol}\n ${alertDetails.target_price} - ${alertDetails.trigger_position}`;
    sendAlert(message);
}

const sendAlert = (message) => {
    createMessageTelegramBot();
    bot.sendMessage(chatId, message);
}

export const SendHighVolAlert = async (alertDetails) => {
    var message = `!!!ALERT!!!\n\High Volume for \n\n${alertDetails.symbol}\t ${alertDetails.interval}\n${alertDetails.volPercent}%\nBuy/Sell Ratio : ${alertDetails.buySellPercent}%`;
    sendAlert(message);
}

export const SendHighSpreadAlert = async (alertDetails) => {
    var message = `!!!ALERT!!!\n\High Movement for \n\n${alertDetails.symbol}\t ${alertDetails.interval}\nDireaction : ${alertDetails.direction} , ${alertDetails.spreadPercent}%\nBuy/Sell Ratio : ${alertDetails.buySellPercent}%`;
    sendAlert(message);
}
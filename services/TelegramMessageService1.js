import { fetchTelegramBot } from '../configs/TelegramBotConfig.js';
import { InsertIntoAlertsTable } from './PriceAlertsDBService1.js';

const chatId = '-4086004522';

export const handleInputMessage = async (msg) => {
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
    else if(messageText.includes("/alertAdd")){
        var alertDetails = getAlertDetails(messageText);
        console.log(alertDetails);
        try {
            var resStatus = await InsertIntoAlertsTable(alertDetails);
            if(resStatus == -1){
                sendDuplicateAlertMessage(msg);
            }
            else{
                sendAlertMessageAdded(msg);
            }
        } catch (error) {
            console.log("Error while inserting to DB", error);
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

const getAlertDetails = (message) => {
    var splits = message.split(" ");
    var symbol = splits[1].toUpperCase();

    return {
        symbol,
        target_price: splits[2],
        trigger_direction: splits[3].toUpperCase()
    }
}

export const sendAlert = (message) => {
    var bot = fetchTelegramBot(handleInputMessage);
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

export const sendDuplicateAlertMessage = (msg) => {
    var bot = fetchTelegramBot(handleInputMessage);
    bot.sendMessage(msg.chat.id, "Same Alert already exists.",{
        reply_to_message_id: msg.message_id,
      });
}

export const sendAlertMessageAdded = (msg) => {
    var bot = fetchTelegramBot(handleInputMessage);
    bot.sendMessage(msg.chat.id, "Allert added Successfully. !!!",{
        reply_to_message_id: msg.message_id,
      });
}
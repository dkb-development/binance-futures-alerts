import TelegramBot from 'node-telegram-bot-api';
import {UpdatePendingToCompleted} from './PriceAlertsDBService.js';
import { InsertIntoAlertsTable, DeleteFromAlertsTable } from './PriceAlertsDBService.js';
import { handleNewEntry } from '../server.js';

const BOT_TOKEN = '5628374625:AAHAdp-0tkILf8s869lGusF17PG4LR6-_CA';
const chatId = '-4086004522';

var bot;
export const createMessageTelegramBot = () => {
    if(!bot){
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
                await InsertIntoAlertsTable(msg);
                await handleNewEntry();
            }
            
        });

        // Handle errors
        bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        console.log("Telegram bor created Successfully. !!!");

    }
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
    bot.sendMessage(chatId, message);
}
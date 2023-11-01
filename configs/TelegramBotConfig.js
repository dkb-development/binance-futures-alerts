import TelegramBot from 'node-telegram-bot-api';
import { getTelegramBot, setTelegramBot} from '../localStorage1.js';


const BOT_TOKEN = '5628374625:AAHAdp-0tkILf8s869lGusF17PG4LR6-_CA';
const chatId = '-4086004522';

var bot = getTelegramBot();
export const fetchTelegramBot = (handleInputMessage) => {
    if(bot === null){
        setTelegramBot(new TelegramBot(BOT_TOKEN, { polling: true }));
        bot = getTelegramBot();

        // Listen for incoming messages
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const messageText = msg.text;

            // console.log(msg.reply_to_message);
            if(msg.text.toUpperCase() == "DEL" || msg.text.toUpperCase()=="DELETE"){
                if(msg.reply_to_message && msg.reply_to_message.text){
                    // DeleteFromAlertsTable(msg.reply_to_message.text);
                    // await handleNewEntry();
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
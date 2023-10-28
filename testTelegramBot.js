import { createMessageTelegramBot, SendPriceAlerts } from "./services/TelegramMessageService.js";
import { telegramBot } from "./localStorage.js";

// Initiate Telegram bot
if(telegramBot === {}){
    telegramBot = createMessageTelegramBot();
}
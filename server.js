import { getDBConnectionDetails, getPendingAlerts, UpdatePendingToCompleted } from "./services/PriceAlertsDBService.js";
import { createMessageTelegramBot, SendPriceAlerts } from "./services/TelegramMessageService.js";
import { startWebSocketForAllSymbols, deleteUnwantedSymbolsConnection } from './services/BinanceFuturesStreamService.js';

const start = async () => {
    // Initiate DB Connection
    await getDBConnectionDetails();

    // Initiate Telegram bot
    createMessageTelegramBot();

    // get updated Pending Alerts every 5 minutes
    var pendingAlerts = await getPendingAlerts();
    // console.log(pendingAlerts);

    var alertSymbolsDetails = {};
    pendingAlerts.forEach(entry => {
        let {_id, symbol, target_price, trigger_status, trigger_position } = entry;

        if(!alertSymbolsDetails[symbol]){
            alertSymbolsDetails[symbol] = [];
        }
        alertSymbolsDetails[entry.symbol].push({
            ...entry
        });
    });
    console.log("Alert Details : \n",alertSymbolsDetails);
    deleteUnwantedSymbolsConnection(Object.keys(alertSymbolsDetails));
    startWebSocketForAllSymbols(alertSymbolsDetails);
}

start();

export const handlePriceTrigger = async (alertDetails) => {
    // Send Telegram message
    SendPriceAlerts(alertDetails);

    // Update COMPLETED in the Alert Table
    await UpdatePendingToCompleted(alertDetails);

    // Fetch the updated list of alerts
    await start();
    
}

export const handleNewEntry = async () => {
    await start();
}

// get updated Pending Alerts every 5 minutes

// Open sockets for new Alerts
// Close sockets for COMPLETED Alerts



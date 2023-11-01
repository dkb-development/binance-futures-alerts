
var telegramBot = null;
export const getTelegramBot = () => {
    return telegramBot;
}
export const setTelegramBot = (bot) => {
    telegramBot = bot;
}

var symbolsDetails = {};
export const getSymbolsDetails = () => {
    return symbolsDetails;
}
export const setSymbolsDetails = (details) => {
    symbolsDetails = details;
}


var socketInstance = null;
export const getSocketInstance = () => {
    return socketInstance;
}
export const setSocketInstance = (socket) => {
    socketInstance = socket;
}

var DBConnection = null;
export const getDBConnections = () => {
    return DBConnection;
}
export const setDBConnection = (connection) => {
    DBConnection = connection;
}
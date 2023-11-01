import WebSocket from 'ws';
import { getSocketInstance, setSocketInstance } from '../localStorage1.js';

// Binance API key information
import { BinanceApiKey, BinanceApiSecret } from "../configs/BinanceConfig.js";
const apiKey = BinanceApiKey;
const apiSecret = BinanceApiSecret;

const wsBaseUrl = 'wss://fstream.binance.com/ws/';


// Function to create a WebSocket connection for a given symbol, interval & callbackFunction
export const openSocket = (symbol, interval, callbackFunc) => {
    var wsInstances = getSocketInstance();
    if(wsInstances === null){
        wsInstances = {};
    }
    if(wsInstances[symbol] && wsInstances[symbol][interval]){
        return;
    }
    console.log("New Symbol came : ", symbol, " for interval : ",interval);

    const wsEndpoint = `${wsBaseUrl}${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(wsEndpoint);

    ws.on('open', () => {
        console.log(`WebSocket Connection Opened for ${symbol} for the interval ${interval}`);
    });

    ws.on('message', (data) => {
        const parsedData = JSON.parse(data);
        if (parsedData.k && parsedData.k.x) {
            callbackFunc(parsedData, symbol, interval);
        }
    });

    ws.on('close', () => {
        console.log(`WebSocket Connection Closed for ${symbol} for the interval ${interval}`);
        // You might want to handle reconnection logic here
    });

    if(!wsInstances[symbol]){
        wsInstances[symbol] = {};
    }
    wsInstances[symbol][interval] = ws;
    setSocketInstance(wsInstances);
    return ws;
};
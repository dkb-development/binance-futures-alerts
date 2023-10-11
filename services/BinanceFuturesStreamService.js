import WebSocket from 'ws';
// Binance API key information
import { BinanceApiKey, BinanceApiSecret } from "../configs/BinanceConfig.js";
const apiKey = BinanceApiKey;
const apiSecret = BinanceApiSecret;
import {handlePriceTrigger} from '../server.js';

import { SendPriceAlerts } from "./TelegramMessageService.js";


// Binance WebSocket base URL
const wsBaseUrl = 'wss://fstream.binance.com/ws/';

var wsInstances = {};


// Function to start WebSocket connections for all symbols
export const startWebSocketForAllSymbols = (alertSymbolsDetails) => {
    // const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', /* Add more symbols as needed */];

    const websockets = Object.keys(alertSymbolsDetails).map((symbol) => createWebSocket(symbol, alertSymbolsDetails[symbol]));
  
};

// Function to create a WebSocket connection for a given symbol
const createWebSocket = (symbol, alertDetails) => {
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
            handleKlineData(parsedData, symbol, alertDetails);
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
const handleKlineData = (kline, symbol, alertDetails) => {
    let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = kline.k;
    if(isFinal){
        // console.info(symbol+" "+interval+" candlestick update");
        // console.info("open: "+open);
        // console.info("high: "+high);
        // console.info("low: "+low);
        // console.info("close: "+close);
        // console.info("volume: "+volume);
        // console.info("isFinal: "+isFinal);
        // console.info("Time: ", new Date().toLocaleString());
        // console.log('-----------------------------');
        // console.log(kline.k);

        var candle = {
            symbol, interval, open: parseFloat(open), high: parseFloat(high), low: parseFloat(low), close: parseFloat(close), volume: parseFloat(volume)
        }
        checkTrigger(candle, alertDetails);
    }
};

export const deleteUnwantedSymbolsConnection = (wantedSymbols) => {
    const socketSymbols = Object.keys(wsInstances);
    const removableSymbols = socketSymbols.filter((symbol) => !wantedSymbols.includes(symbol));
    removableSymbols.forEach((symbol) => {
        closeWebSocket(symbol);
    })
}

const checkTrigger = (candle, alertDetails) => {
    const {symbol, interval, open, high, low, close, volume} = candle;
    var symbolALerts = alertDetails;
    
    symbolALerts.forEach(async (alertDetails) => {
        // console.log("Checking Alert Details ");
        // console.log(alertDetails);

        const triggerPosition = alertDetails.trigger_position;
        const triggerPrice = parseFloat(alertDetails.target_price);

        console.log(triggerPosition, triggerPrice);
        switch(triggerPosition){
            case "DOWN":
                parseFloat(low) < triggerPrice ? await handlePriceTrigger(alertDetails) : null;
                break;
            case "UP":
                high > triggerPrice ? await handlePriceTrigger(alertDetails) : null;
                break;
            default:
                break;

        }

    })
}

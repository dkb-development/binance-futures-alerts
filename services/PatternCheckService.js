import {getDBConnectionDetails, getAllTrackedSymbols} from './PatternCheckDBService.js';
import {getLatestCandlesticks} from './BinanceFuturesRestService.js';
import { symbolsDetails } from '../localStorage.js';
import { createCustomWebSocket } from './BinanceFuturesStreamService.js';
import { SendHighVolAlert, SendHighSpreadAlert } from './TelegramMessageService.js';

// Modifying the console.log to print the data & time
const originalConsoleLog = console.log;

console.log = function () {
  const timestamp = new Date();
  const args = Array.from(arguments).map(arg => {
    return typeof arg === 'object' ? arg : arg;
  });
  originalConsoleLog(`[${timestamp}]`, ...args);
};
// Modifying the console.log to print the data & time

export const startPatternCheck = async () => {
    // At start make db query to fetch all the coins for which sockets will be opened
    await getDBConnectionDetails();

    var symbols = await getAllTrackedSymbols();
    setInitialSymbolHistory(symbols);

    // Create websocket
    symbols.forEach(element => {
        var symbol = element.symbol, interval = element.interval, limit = 20;
        createCustomWebSocket(symbol, interval, patternCheckCallbackFunc);
    })
};

startPatternCheck();

const setInitialSymbolHistory = (symbols) => {
    symbols.forEach(async element => {
        var symbol = element.symbol, interval = element.interval, limit = 20;
        if(symbolsDetails[symbol] && symbolsDetails[symbol][interval]){
            return;
        }
        
        var candleSticks = await getLatestCandlesticks(element.symbol, interval, 20);
        var vols = [], volIndex = 0, avgVol=0;
        var spreads = [], spreadIndex = 0, avgSpread=0;
        let totalSpread = 0, totalVol = 0;

        candleSticks.forEach(candle => {
            let [ opentime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume, ignore ] = candle;
            open = parseFloat(open);
            high = parseFloat(high);
            low = parseFloat(low);
            close = parseFloat(close);
            volume = parseFloat(volume);
            closeTime = new Date(closeTime);

            // console.info(symbol+" "+interval+" candlestick update");
            // console.info("open: "+open);
            // console.info("high: "+high);
            // console.info("low: "+low);
            // console.info("close: "+close);
            // console.info("volume: "+volume);
            // console.info("closetime: "+new Date(closeTime));
            // console.info("Time: ", new Date().toLocaleString());

            var candleStickSpread = Math.abs(high-low);

            vols.push(volume);
            spreads.push(candleStickSpread);

            totalSpread += candleStickSpread;
            totalVol += volume;
        });

        avgSpread = parseFloat((totalSpread/spreads.length).toFixed(6));
        avgVol = parseFloat((totalVol/vols.length).toFixed(6));


        if (typeof symbolsDetails[symbol] === 'undefined') {
            symbolsDetails[symbol] = {};
        }
        symbolsDetails[symbol][interval] = {
                vols,
                spreads,
                volIndex,
                spreadIndex,
                avgSpread,
                avgVol
        };
        // console.log("All SYmbols : ",symbolsDetails);
    });
}

const patternCheckCallbackFunc = (parsedData, currSymbol, currInterval) => {
    // console.log(parsedData, currSymbol, currInterval);
    var symbol = currSymbol;
    let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = parsedData.k;
    if(isFinal){
        var candle = {
            symbol, interval, open: parseFloat(open), high: parseFloat(high), low: parseFloat(low), close: parseFloat(close), volume: parseFloat(volume)
        }

        var symbolHistory = symbolsDetails[symbol][interval];

        // check whether the current vol is alarming
        var volPercent = checkHighVol(candle, symbol, interval, symbolHistory);
        if(volPercent != -1){
            // send the telegram alert for high volume
            SendHighVolAlert({
                symbol,
                interval,
                volPercent
            })
        }

        // check whether the current spread is alarming
        var spreadPercent = checkHighSpread(candle, symbol, interval, symbolHistory);
        if(spreadPercent != null){
            // Send the telegram alert for high Spread
            SendHighSpreadAlert({
                symbol,
                interval,
                direction : (spreadPercent >= 0 ? "UP" : "DOWN"),
                spreadPercent
            });
        }

        // set the current vol & spread
        var {
            vols,
            spreads,
            volIndex,
            spreadIndex,
            avgSpread,
            avgVol
        } = symbolHistory;
        
        vols[volIndex] = candle.volume;
        volIndex += 1;
        spreads[spreadIndex] = parseFloat(Math.abs(candle.high - candle.low).toFixed(6));
        spreadIndex += 1;

        // set the everage value
        avgSpread = calculateAverage(spreads);
        avgVol = calculateAverage(vols);

        // Save the final Details
        symbolsDetails[symbol][interval] = {
            vols,
            spreads,
            volIndex,
            spreadIndex,
            avgSpread,
            avgVol
        }
        console.log("Updated data for ", symbol, " for interval ", interval);
        // console.log(symbolsDetails);
    }
}

const checkHighVol = (currentCandle, currSymbol, currInterval, symbolHistory) => {
    let {symbol, interval, open, high, low, close, volume} = currentCandle;
    var volumePercent = parseFloat(((volume/symbolHistory.avgVol)*100).toFixed(6));

    console.log(`Symbol : ${symbol} , Interval : ${interval} -> Current Volume : ${volume.toFixed(6)} & Average Volume : ${symbolHistory.avgVol.toFixed(6)}`);


    if(volumePercent >= 300){
        console.log(volume,symbolHistory.avgVol);
        return volumePercent;
    }
    return -1;
}

const checkHighSpread = (currentCandle, currSymbol, currInterval, symbolHistory) => {
    let {symbol, interval, open, high, low, close, volume} = currentCandle;
    var currSpread = Math.abs(high-low);
    var spreadPercent = parseFloat(((currSpread/symbolHistory.avgSpread)*100).toFixed(6));

    console.log(`Symbol : ${symbol} , Interval : ${interval} -> Current Spread : ${currSpread.toFixed(6)} & Average Spread : ${symbolHistory.avgSpread.toFixed(6)}`);

    if(spreadPercent >= 300){
        return open > close ? -1*spreadPercent : spreadPercent;
    }
    return null;
}

const calculateAverage = (array) => {
    // Sum up all the elements in the array
    const sum = array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

    // Divide the sum by the number of elements in the array
    const average = sum / array.length;

    return parseFloat(average.toFixed(6));
}

// At start make api call to fetch candlestick and volume data of last 10/20 candles to store locally
// Upon every candle close recalculate the average candle size and average volume and check for hammer candle or extra-ordinary large candles
// If hammer candle is present then send the telegram alert


// when telegram request comes to add/delete any coin
//      insert into the table
//      fetch the fresh set of coins from the table
//      open/close the socket connections

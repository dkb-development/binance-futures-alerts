import axios from 'axios';

export const getLatestCandlesticks = async (symbol, interval, limit) => {
  try {
    // Make a GET request to the Binance Futures API endpoint
    const response = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
      params: {
        symbol: symbol,
        interval: interval,
        limit: limit,
      },
    });

    return response.data;
  } catch (err) {
    console.error(err);
  }
};

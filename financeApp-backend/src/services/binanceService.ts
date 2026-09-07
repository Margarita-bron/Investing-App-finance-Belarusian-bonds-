import axios from 'axios';

export async function getBinancePrice(symbol: string): Promise<number> {
  const response = await axios.get(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  );
  return parseFloat(response.data.price);
}
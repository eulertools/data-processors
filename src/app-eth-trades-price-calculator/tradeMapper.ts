import {getFactoryAddress} from "./getFactoryAddress";
import {chainConfig} from "./fixtures";
import {getPriceUSD} from "./getPriceUSD";

export const tradeMapper: any = async (record: any, pair_data: any) => {
  const {wad_stable_pair, stable_coins, wad_address} = chainConfig()

  try {
    const isStable = stable_coins.includes(pair_data.base_token_address.toLowerCase()) || stable_coins.includes(pair_data.quote_token_address.toLowerCase())

    const isWAD = pair_data.base_token_address.toLowerCase() === wad_address.toLowerCase() || pair_data.quote_token_address.toLowerCase() === wad_address.toLowerCase()

    const priceWAD = await getPriceUSD(wad_stable_pair.wad_address, record.block_timestamp)

    const base_in = parseInt(record.base_in, 10) / (10 ** parseInt(pair_data.base_token_decimals))
    const base_out = parseInt(record.base_out, 10) / (10 ** parseInt(pair_data.base_token_decimals))
    const quote_in = parseInt(record.quote_in, 10) / (10 ** parseInt(pair_data.quote_token_decimals))
    const quote_out = parseInt(record.quote_out, 10) / (10 ** parseInt(pair_data.quote_token_decimals))

    if ((base_in > 0 && quote_out === 0) || (quote_in > 0 && base_out === 0)) {
      return undefined
    }

    const price_base = (base_in > 0 && quote_out > 0) ? quote_out / base_in : quote_in / base_out
    const price_quote = (base_in > 0 && quote_out > 0) ? base_in / quote_out : base_out / quote_in
    let price_bnb = 0.0;
    let price_usd = null;
    let token_volume = 0.0;
    let volume = 0.0;
    let quoted_token;
    let quoted_token_symbol;
    let base_price_usd;
    let quote_price_usd;
    const ratio = (base_in > 0 && quote_out > 0) ? quote_out / base_in : quote_in / base_out

    if (isStable && isWAD) {
      if (pair_data.base_token_address.toLowerCase() == wad_address.toLowerCase()) {
        quoted_token = pair_data.base_token_address
        quoted_token_symbol = pair_data.base_token_symbol
        price_bnb = price_quote
        volume = (base_in > 0 && quote_out > 0) ? quote_out : quote_in
        base_price_usd = priceWAD;
        quote_price_usd = 1.0;
      } else {
        quoted_token = pair_data.quote_token_address
        quoted_token_symbol = pair_data.quote_token_symbol
        price_bnb = price_base
        volume = (base_in > 0 && quote_out > 0) ? base_in : base_out
        base_price_usd = 1.0;
        quote_price_usd = priceWAD;
      }
      price_bnb = pair_data.base_token_address.toLowerCase() == wad_address.toLowerCase() ? price_base : price_quote;
      price_usd = price_bnb;
    } else if (isStable) {
      if (stable_coins.includes(pair_data.base_token_address.toLowerCase())) {
        quoted_token = pair_data.quote_token_address
        quoted_token_symbol = pair_data.quote_token_symbol
        price_usd = price_quote;
        price_bnb = priceWAD > 0 ? price_usd / priceWAD : 0.0
        volume = (base_in > 0 && quote_out > 0) ? base_in : base_out
        base_price_usd = 1.0;
        quote_price_usd = price_quote;
      }
      if (stable_coins.includes(pair_data.quote_token_address.toLowerCase())) {
        quoted_token = pair_data.base_token_address
        quoted_token_symbol = pair_data.base_token_symbol
        price_usd = price_base;
        price_bnb = priceWAD > 0 ? price_usd / priceWAD : 0.0
        volume = (base_in > 0 && quote_out > 0) ? quote_out : quote_in
        base_price_usd = price_base;
        quote_price_usd = 1.0;
      }
    } else if (isWAD) {
      if (pair_data.base_token_address.toLowerCase() === wad_address.toLowerCase()) {
        quoted_token = pair_data.quote_token_address
        quoted_token_symbol = pair_data.quote_token_symbol
        price_bnb = price_quote
        token_volume = (base_in > 0 && quote_out > 0) ? base_in : base_out
        base_price_usd = priceWAD;
        quote_price_usd = price_bnb * priceWAD;
      } else {
        quoted_token = pair_data.base_token_address
        quoted_token_symbol = pair_data.base_token_symbol
        price_bnb = price_base
        token_volume = (base_in > 0 && quote_out > 0) ? quote_out : quote_in
        base_price_usd = price_bnb * priceWAD;
        quote_price_usd = priceWAD;
      }
      price_usd = price_bnb * priceWAD;
      volume = token_volume * priceWAD;
    } else {
      base_price_usd = await getPriceUSD(pair_data.base_token_address, record.block_timestamp)
      quote_price_usd = await getPriceUSD(pair_data.quote_token_address, record.block_timestamp)
      base_price_usd = base_price_usd === 0 ? null : base_price_usd
      quote_price_usd = quote_price_usd === 0 ? null : quote_price_usd
      quoted_token = pair_data.quote_token_address
      quoted_token_symbol = pair_data.quote_token_symbol
      const base_token_volume = (base_in > 0 && quote_out > 0) ? base_in : base_out
      const quote_token_volume = (base_in > 0 && quote_out > 0) ? quote_out : quote_in
      let traded_base_volume = 0;
      let traded_quote_volume = 0;
      if (base_price_usd && quote_price_usd) {
        traded_base_volume = base_token_volume * base_price_usd
        traded_quote_volume = quote_token_volume * quote_price_usd
        volume = base_token_volume * base_price_usd
      } else if (base_price_usd) {
        traded_base_volume = base_token_volume * base_price_usd
        traded_quote_volume = traded_base_volume / base_token_volume
        volume = base_token_volume * base_price_usd
      } else if (quote_price_usd) {
        traded_quote_volume = quote_token_volume * quote_price_usd
        traded_base_volume = traded_quote_volume / base_token_volume
        volume = quote_token_volume * quote_price_usd
      }
      price_usd = traded_base_volume / traded_quote_volume
    }

    let factory = pair_data.factory_address
    if (factory == null) {
      factory = await getFactoryAddress(record.address);
    }

    price_usd = Number.isNaN(price_usd) ? null : price_usd;

    const trade = {
      pair_data,
      transaction_hash: record.transaction_hash,
      log_index: parseInt(record.log_index, 10),
      block_number: parseInt(record.block_number, 10),
      isStable,
      isWAD,
      base_in,
      base_out,
      quote_in,
      quote_out,
      price_base,
      price_quote,
      price_bnb,
      price_usd,
      volume,
      ratio,
      base_price_usd,
      quote_price_usd,
      quoted_token_symbol,
      quoted_token,
      address: record.address,
      base_token: pair_data.base_token_address.toLowerCase(),
      base_symbol: pair_data.base_token_symbol,
      quote_token: pair_data.quote_token_address.toLowerCase(),
      quote_symbol: pair_data.quote_token_symbol,
      block_timestamp: record.block_timestamp,
      factory
    }
    return trade
  } catch (e) {
    console.log("error trade calculation", [record.address, e])
    return undefined;
  }
}

import * as bsc from './bsc';
import * as eth from './eth';
import * as polygon from './polygon';

export const chainConfig = () => {
  const chain_id = process.env.CHAIN_ID
  const configs = {
    bsc: {
      stable_coins: bsc.STABLE_COINS,
      wad_address: bsc.WAD_ADDRESS,
      exchanges: bsc.EXCHANGES,
      wad_symbol: bsc.WAD_SYMBOL,
      wad_stable_pair: bsc.WAD_STABLE_PAIR
    },
    eth: {
      stable_coins: eth.STABLE_COINS,
      wad_address: eth.WAD_ADDRESS,
      exchanges: eth.EXCHANGES,
      wad_symbol: eth.WAD_SYMBOL,
      wad_stable_pair: eth.WAD_STABLE_PAIR
    },
    polygon: {
      stable_coins: polygon.STABLE_COINS,
      wad_address: polygon.WAD_ADDRESS,
      exchanges: polygon.EXCHANGES,
      wad_symbol: polygon.WAD_SYMBOL,
      //wad_stable: polygon.WAD_STABLE_PAIR
    },
  }

  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wad_address: configs[chain_id].wad_address.toLowerCase(),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    stable_coins: configs[chain_id].stable_coins,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    exchanges: configs[chain_id].exchanges,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wad_symbol: configs[chain_id].wad_symbol,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wad_stable_pair: configs[chain_id].wad_stable_pair
  }
}

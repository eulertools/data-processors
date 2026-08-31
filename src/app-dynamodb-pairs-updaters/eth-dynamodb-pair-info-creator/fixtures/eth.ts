export const EXCHANGES = [
  {
    chain: "eth",
    short_name: "uniswapv2",
    name: "Uniswap V2",
    address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
  },
]

export const TOKENS = [
  {name: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', stable: false, ticker: 'ETHUSDT'},
  {name: 'BNB', address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', stable: false, ticker: 'BNBUSDT'},
  {name: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', stable: true},
  {name: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', stable: true},
  {name: 'BUSD', address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53', stable: true},
  {name: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', stable: true},
  {name: 'UST', address: '0xa47c8bf37f92aBed4A126BDA807A7b7498661acD', stable: true},
]

export const WAD_STABLE_PAIR = {
  wad_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  quote_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  address: "0x1f98431c8ad98523631ae4a59f267346ea31f984"
}

export const STABLE_COINS: any[] = TOKENS.filter((el: any)=> el.stable).map((stable)=> stable.address.toLowerCase())

export const WAD_ADDRESS = TOKENS[0].address

export const WAD_SYMBOL = 'ETH'

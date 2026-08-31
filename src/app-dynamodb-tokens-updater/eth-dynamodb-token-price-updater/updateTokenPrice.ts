import * as DynamoDB from "./dynamodb"

require('dotenv').config();

const chainId = process.env.CHAIN_ID;

export const updateTokenPrice = async (trade: any) => {

  const key = {
    identifier: `${chainId}~token~${trade.quoted_token}`,
    kind: 'token'
  }

  const item = await DynamoDB.getItem(process.env.CATALOG_DDB_TABLE, key, 'circulation_supply');

  if(item.circulation_supply) trade.market_cap = Number(trade.price_usd) * Number(item.circulation_supply);

  const token:any = {
    ...key,
    price_usd: Number(trade.price_usd).toFixed(20).toString(),
    readable_update_date: new Date(trade.block_timestamp).toISOString(),
    update_date: Number.parseInt(new Date(trade.block_timestamp).getTime().toString())
  }

  if(trade.market_cap) token.market_cap = trade.market_cap;

  try {
    const result = await DynamoDB.updateItem(process.env.CATALOG_DDB_TABLE, key, token, 
      'attribute_not_exists(#update_date) OR #update_date < :update_date');
    return result
  } catch (e) {
    console.log("Error", e)
    return e
  }
}

import * as DynamoDB from "./dynamodb"
import { Client } from '@opensearch-project/opensearch';
import * as Mapping from './mapping';

require('dotenv').config();

const chainId = (process.env.CHAIN_ID as string);

const mappingNetwork:any[] = [
  { "source": "price_usd", "destination" : "price_usd" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "market_cap", "destination" : "market_cap" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "update_date", "destination" : "update_date_price" , overwrite: true }
]

const mapping:any[] = [
  { "source": "price_usd", "destination" : "price_usd.euler" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "market_cap", "destination" : "market_cap.euler" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "update_date", "destination" : "update_date_price" , overwrite: true }
]

export const updateTokenPrice = async (trade: any) => {

  const node = `https://${process.env.OS_DOMAIN}`;

  const client = new Client({
    nodes:  [ node ],
    ssl: {
      rejectUnauthorized: false,
    },
    auth: {
      username: process.env.OS_USER as string,
      password: process.env.OS_PASSWORD as string
    },
    maxRetries: 5,
    requestTimeout: 60000,
    sniffOnStart: false,
  });

  const id = (await client.search({
    index: process.env.OS_INDEX,
    body: {
      query: {
        match_phrase: {
          [`networks.${chainId}.address`]: trade.quoted_token
        }
      }
    }
  })).body?.hits?.hits[0]?._id;

  if(id) {
    
    const result = await DynamoDB.getItem({
      TableName: process.env.CATALOG_DDB_TABLE,
      KeyConditionExpression: '#identifier  = :identifier',
      FilterExpression: '#source = :source',
      ExpressionAttributeNames:{
          '#identifier': 'identifier',
          '#source': 'source',
      },
      ExpressionAttributeValues: {
        ':identifier': { S: `${id}` },
        ':source': { S: 'euler' },
      },
      ScanIndexForward: false,
    });

    const key = {
      identifier: result.identifier,
      update_date: Math.round(new Date().getTime() / 1000)
    }

    delete result.identifier;
    delete result.update_date;

    const value = {
      ...key,
      ...result,
    }

    value.readable_update_date = new Date().toISOString();
  
    const token:any = {
      price_usd: Number(trade.price_usd).toFixed(20).toString(),
      update_date: new Date().toISOString()
    }

    if(result.networks[chainId].circulating_supply) {
      token.market_cap = Number(token.price_usd) * Number(result.networks[chainId].circulating_supply);
    } else if(result.networks[chainId].total_supply) {
      token.market_cap = Number(token.price_usd) * Number(result.networks[chainId].total_supply);
    }
    
    Mapping.merge(token, result.networks[chainId], mappingNetwork);

    let market_cap = 0;

    Object.values(value.networks).forEach((network:any) => {
      if(network.market_cap) market_cap += network.market_cap
    })

    Mapping.merge({ 
      update_date: new Date().toISOString(),
      market_cap,
      price_usd: token.price_usd
    }, value, mapping);

    try {
      const result = await DynamoDB.updateItem(process.env.CATALOG_DDB_TABLE,key, value, null);
      return result
    } catch (e) {
      console.log("Error", e)
      return e
    }
  }
}

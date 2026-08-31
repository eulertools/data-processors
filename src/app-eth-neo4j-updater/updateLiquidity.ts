import * as DynamoDB from './dynamodb';
import * as Utils from 'web3-utils'

require('dotenv').config();

const Sentry = require('@sentry/serverless');

export const updateLiquidity = async (session:any,token:string) => {

  const query = `MATCH p=()-[r:Pool]->() 
    WHERE r.base_token = '${token}' or r.quote_token ='${token}' 
    WITH SUM(CASE WHEN r.base_token = '${token}' THEN r.base_reserves ELSE r.quote_reserves END) AS liquidity
    RETURN liquidity`;

  try {
    
    const result = await session.run(query);

    if(result.records.length > 0) {
      const keys = result.records[0]._fieldLookup;
      const liquidity = result.records[0].get(keys.liquidity);
      await DynamoDB.updateItem('catalog', 
        { identifier: `bsc~token~${Utils.toChecksumAddress(token)}`, kind: 'token' }, 
        { identifier: `bsc~token~${Utils.toChecksumAddress(token)}`, kind: 'token', liquidity } 
      );
    }
  } catch(e)  {
    Sentry.captureException({message: 'Failed, error occured', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
    console.log(e);
  };
}






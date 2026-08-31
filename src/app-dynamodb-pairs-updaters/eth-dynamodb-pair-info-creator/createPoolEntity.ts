import {getTokenSupply} from "./getTokenSupply";
import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {getToken} from "./getToken";

const ddbClient = new DynamoDBClient({})

export const createContract = async (pairCreated: any) => {
  const {base_token, quote_token, factory_address} = pairCreated;

  try {
    const createContractCommand = new PutItemCommand({
      TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
      Item: {
        address: {S: pairCreated.address},
        base_token_address: {S: base_token.address},
        base_token_balance: {N: "0"},
        base_token_decimals: {N: base_token.decimals.toString()},
        base_token_name: {S: base_token.name},
        base_token_symbol: {S: base_token.symbol},
        category: {S: "pool"},
        create_date: {N: new Date().getTime().toString()},
        factory_address: {S: factory_address},
        identifier: {S: `${process.env.CHAIN_ID}~contract~${pairCreated.address}`},
        kind: {S: 'contract'},
        name: {S: `Pool ${base_token.name}-${quote_token.name}`},
        owner: {S: factory_address},
        owner_name: {S: factory_address},
        quote_token_address: {S: quote_token.address},
        quote_token_balance: {N: "0"},
        quote_token_decimals: {N: quote_token.decimals.toString()},
        quote_token_name: {S: quote_token.name},
        quote_token_symbol: {S: quote_token.symbol},
        readable_create_date: {S: new Date().toISOString()},
        readable_update_date: {S: new Date().toISOString()},
        symbol: {S: `${base_token.symbol}/${quote_token.symbol}`},
        update_date: {N: new Date().getTime().toString()},
      },
    });

    return await ddbClient.send(createContractCommand);
  } catch (e) {
    console.log(e)
    throw e
  }
}

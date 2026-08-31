import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {ERC20ABI} from "./erc20";
import {getToken} from "./getToken";

const ddbClient = new DynamoDBClient({})

export const createLPToken = async (pairCreated: any) => {
  const chainId = process.env.CHAIN_ID;

  try {
    const tokenContract = new web3Client.eth.Contract(ERC20ABI, pairCreated.address);
    const totalSupply = await tokenContract.methods.totalSupply().call();
    let symbol = "Unknown"
    try {
      symbol = await tokenContract.methods.symbol().call();
    } catch (e) {
      console.log("Swap Contract is not pancake", pairCreated.address)
    }
    let name = "Unknown"
    try {
      name = await tokenContract.methods.name().call();
    } catch (e) {
      console.log("Swap Contract is not pancake", pairCreated.address)
    }
    let decimals = 18
    try {
      decimals = await tokenContract.methods.decimals().call();
    } catch (e) {
      console.log("Swap Contract is not pancake", pairCreated.address)
    }

    const createLPTokenCommand = new PutItemCommand({
      TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
      Item: {
        identifier: {S: `${chainId}~token~${pairCreated.address}`},
        kind: {S: 'token'},
        address: {S: pairCreated.address},
        base_token_address: {S: pairCreated.base_token.address},
        base_token_balance: {N: "0"},
        base_token_decimals: {N: pairCreated.base_token.decimals.toString()},
        base_token_name: {S: pairCreated.base_token.name},
        base_token_symbol: {S: pairCreated.base_token.symbol},
        category: {S: "lp-token"},
        create_date: {N: new Date().getTime().toString()},
        decimals: {N: decimals.toString()},
        factory_address: {S: pairCreated.factory_address},
        name: {S: `${name} ${pairCreated.base_token.name}-${pairCreated.quote_token.name}`},
        owner: {S: pairCreated.factory_address},
        owner_name: {S: pairCreated.factory_address},
        quote_token_address: {S: pairCreated.quote_token.address},
        quote_token_balance: {N: '0'},
        quote_token_decimals: {N: pairCreated.quote_token.decimals.toString()},
        quote_token_name: {S: pairCreated.quote_token.name},
        quote_token_symbol: {S: pairCreated.quote_token.symbol},
        readable_create_date: {S: new Date().toISOString()},
        readable_update_date: {S: new Date().toISOString()},
        symbol: {S: symbol},
        totalSupply: {N: totalSupply.toString()},
        update_date: {N: `${new Date().getTime()}`},
      },
    });

    const lpToken = await ddbClient.send(createLPTokenCommand);
    return lpToken
  } catch (e) {
    throw(e)
  }
}

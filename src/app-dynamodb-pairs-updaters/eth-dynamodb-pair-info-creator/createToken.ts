import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {ERC20ABI} from "./erc20";
import {rawWeb3Call} from "./web3Clients/utils/rawClient";

const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION})

export const createToken = async (address: string) => {

  try {
    let symbol;
    let name;
    let decimals;
    let totalSupply;
    const tokenContract = new web3Client.eth.Contract(ERC20ABI, address);

    try {
      totalSupply = await tokenContract.methods.totalSupply().call();
    } catch (e) {
      totalSupply = 0
    }

    try {
      symbol = await tokenContract.methods.symbol().call();
    } catch (e) {
      symbol = await rawWeb3Call(address, "symbol") || 'unknown'
    }

    try {
      name = await tokenContract.methods.name().call();
    } catch (e) {
      name = await rawWeb3Call(address, "name") || 'unknown'
    }

    try {
      decimals = await tokenContract.methods.decimals().call();
    } catch (e) {
      decimals = 0
    }

    const createTokenCommand = new PutItemCommand({
      TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
      Item: {
        identifier: {S: `${process.env.CHAIN_ID}~token~${address}`},
        kind: {S: 'token'},
        symbol: {S: symbol},
        price_bnb: {N: '0'},
        address: {S: address},
        name: {S: name},
        market_cap: {N: '0'},
        price_usd: {N: '0'},
        total_supply: {N: (parseInt(totalSupply)).toString()},
        category: {S: 'token'},
        chain: {S: 'bsc'},
        decimals: {N: decimals.toString()},
        create_date: {N: new Date().getTime().toString()},
        readable_create_date: {S: new Date().toISOString()},
        update_date: {N: new Date().getTime().toString()},
        readable_update_date: {S: new Date().toISOString()}
      },
    });
    const token = await ddbClient.send(createTokenCommand);

    return token
  } catch (e) {
    throw "Token is invalid: " + address
  }
}

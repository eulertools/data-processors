import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {ERC20ABI} from "./erc20";
import {getToken} from "./getToken";

const ddbClient = new DynamoDBClient({})

export const createToken = async (pairCreated: any) => {
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

    const tokenDetails = {
      identifier: {S: `${chainId}~token~${pairCreated.address}`},
      kind: {S: 'token'},
      address: {S: pairCreated.address},
      category: {S: "token"},
      create_date: {N: new Date().getTime().toString()},
      decimals: {N: decimals.toString()},
      name: {S: `${name}`},
      readable_create_date: {S: new Date().toISOString()},
      readable_update_date: {S: new Date().toISOString()},
      symbol: {S: symbol},
      total_supply: {N: totalSupply.toString()},
      update_date: {N: `${new Date().getTime()}`},
    }

    const createTokenCommand = new PutItemCommand({
      TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
      Item: {...tokenDetails},
    });

    await ddbClient.send(createTokenCommand);
    return tokenDetails
  } catch (e) {
    throw(e)
  }
}

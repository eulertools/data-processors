import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {ERC20ABI} from "./erc20";

const ddbClient = new DynamoDBClient({})

export const createAddress = async (pairCreated: any) => {
  const {base_token, quote_token} = pairCreated;
  const chainId = process.env.CHAIN_ID;

  try {
    const tokenContract = new web3Client.eth.Contract(ERC20ABI, pairCreated.address);
    let symbol = "Unknown";
    try {
      symbol = await tokenContract.methods.symbol().call();
    } catch (e) {
      console.log("Swap Contract is not pancake", pairCreated.address)
    }

    const createAddressCommand = new PutItemCommand({
      TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
      Item: {
        identifier: {S: `${chainId}~address~${pairCreated.address}`},
        kind: {S: 'address'},
        category: {S: "pair"},
        owner: {S: pairCreated.factory_address},
        owner_name: {S: pairCreated.factory_address},
        address: {S: pairCreated.address},
        name: {S: `${symbol} ${base_token.symbol}-${quote_token.symbol}`},
        update_date: {N: new Date().getTime().toString()},
        create_date: {N: new Date().getTime().toString()},
        readable_create_date: {S: new Date().toISOString()},
        readable_update_date: {S: new Date().toISOString()},
        factory_address: {S: pairCreated.factory_address},
      },
    });
    const newAddress = await ddbClient.send(createAddressCommand);
    return newAddress
  } catch (e) {
    throw(e)
  }
}

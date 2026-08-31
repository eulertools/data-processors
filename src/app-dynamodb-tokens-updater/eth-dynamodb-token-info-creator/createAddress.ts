import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {ERC20ABI} from "./erc20";

const ddbClient = new DynamoDBClient({})

export const createAddress = async (token: any) => {
  const chainId = process.env.CHAIN_ID;

  try {
    const createAddressCommand = new PutItemCommand({
      TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
      Item: {
        identifier: {S: `${chainId}~address~${token.address}`},
        kind: {S: 'address'},
        category: {S: "token"},
        address: {S: token.address},
        name: {S: `${token.symbol}`},
        update_date: {N: new Date().getTime().toString()},
        create_date: {N: new Date().getTime().toString()},
        readable_create_date: {S: new Date().toISOString()},
        readable_update_date: {S: new Date().toISOString()},
      },
    });

    return await ddbClient.send(createAddressCommand);
  } catch (e) {
    throw(e)
  }
}

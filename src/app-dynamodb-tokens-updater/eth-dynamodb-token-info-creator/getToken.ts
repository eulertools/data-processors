import {DynamoDBClient, GetItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {unmarshall} from "@aws-sdk/util-dynamodb";

const ddbClient = new DynamoDBClient({})

export const getToken = async (tokenAddress: string) => {
  const address = web3Client.utils.toChecksumAddress(tokenAddress)

  const identifier = `${process.env.CHAIN_ID}~token~${address}`

  const getItem = new GetItemCommand({
    TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
    Key: {
      identifier: {S: identifier},
      kind: {S: 'token'}
    }
  });

  try {
    let token;
    const token_request = await ddbClient.send(getItem)
    if (token_request.Item) {
      token = unmarshall(token_request.Item!)
    } else {
      throw `token not found in dynamodb: ${address}`
    }

    return token
  } catch (e) {
    console.log("token not found", identifier)
    throw e
  }
}

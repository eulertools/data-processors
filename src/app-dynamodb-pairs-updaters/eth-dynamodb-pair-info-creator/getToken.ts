import {DynamoDBClient, GetItemCommand} from "@aws-sdk/client-dynamodb";
import {web3Client} from "./web3Clients";
import {unmarshall} from "@aws-sdk/util-dynamodb";
import {createToken} from "./createToken";

const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION})

export const getToken = async (tokenAddress: string) => {
  const address = web3Client.utils.toChecksumAddress(tokenAddress)

  const identifier = `${process.env.CHAIN_ID}~token~${address}`

  const getItem = new GetItemCommand({
    TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
    Key: {
      identifier: {S: identifier},
      kind: {S: 'token'},
    },
    ProjectionExpression: ["identifier",
      "kind",
      "#c",
      "symbol",
      "decimals",
      "total_supply",
      "factory_address",
      "address",
      "volumes"].join(','),
    ExpressionAttributeNames: {'#c': 'name'}
  });

  try {
    let token;
    const token_request = await ddbClient.send(getItem)
    if (token_request.Item) {
      token = unmarshall(token_request.Item!)
    } else {
      try {
        await createToken(address);
        token = await ddbClient.send(getItem).then((res: any) => unmarshall(res.Item))
      } catch (e) {
        throw "Token is invalid: " + [address, e]
      }
    }

    return token
  } catch (e) {
    console.log("Error: ", e)
    throw e
  }
}

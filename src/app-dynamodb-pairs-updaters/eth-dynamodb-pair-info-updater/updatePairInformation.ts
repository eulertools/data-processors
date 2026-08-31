import {DynamoDBClient, UpdateItemCommand} from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION})

export const updatePairInformation = async (trade: any) => {
  const chainId = process.env.CHAIN_ID;

  const updateContractCommand = new UpdateItemCommand({
    TableName: process.env.CATALOG_DDB_TABLE,
    Key: {identifier: {S: `${chainId}~contract~${trade.address}`}, kind: {S: 'contract'}},
    UpdateExpression: "SET readable_update_date=:readable_update_date,update_date=:update_date,base_token_price=:base_token_price,quote_token_price=:quote_token_price",
    ExpressionAttributeValues: {
      ":base_token_price": {N: Number(trade.price_base).toFixed(20).toString()},
      ":quote_token_price": {N: Number(trade.price_quote).toFixed(20).toString()},
      ":readable_update_date": {S: new Date(trade.block_timestamp).toISOString()},
      ":update_date": {N: new Date(trade.block_timestamp).getTime().toString()},
    },
    ConditionExpression: "update_date < :update_date",
    ReturnValues: "NONE"
  })

  try {
    return ddbClient.send(updateContractCommand)
  } catch (e) {
    console.log(JSON.stringify({
      error: e,
      address: trade.address,
      actor: "updater",
      object: "updatePairInformation",
      command: updateContractCommand
    }))
    throw e
  }
}

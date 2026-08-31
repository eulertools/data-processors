
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const ddbClient = new DynamoDB({});

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true,
};

export const updateDynamoDB = async (table: any, key: any, value: any) => {

  let updateExpression = "SET ";
  const expressionAttributeValues = {}

  const valueMarshal = marshall(value, marshallOptions);

  const keys = Object.keys(key);

  Object.keys(value).forEach((entry: any) => {
    if (!keys.includes(entry)) {
      updateExpression = `${updateExpression} ${entry} = :${entry} ,`;
      // @ts-ignore
      expressionAttributeValues[`:${entry}`] = valueMarshal[entry];
    }
  })

  updateExpression = updateExpression.substring(0, updateExpression.lastIndexOf(','));

  const params = {
    TableName: table,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues
  };

  await ddbClient.updateItem(params);
}

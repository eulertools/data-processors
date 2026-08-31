const AWS = require('aws-sdk');

const ddbClient = new AWS.DynamoDB();

const marshallOptions:any = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true,
};

export const getItem = async (table: any, key: any, attributes:any) => {

  const params:any = {
    TableName: table,
    Key: AWS.DynamoDB.Converter.marshall(key, marshallOptions),
  };

  if(attributes) params.ProjectionExpression = attributes;

  const { Item } = await ddbClient.getItem(params).promise();

  if(Item) return AWS.DynamoDB.Converter.unmarshall(Item);

  return undefined;
}

export const updateItem = async (table: any, key: any, value: any, conditionExpression:any) => {

    let updateExpression = "SET ";
    const expressionAttributeNames:any = {}
    const expressionAttributeValues:any = {}
  
    const valueMarshal = AWS.DynamoDB.Converter.marshall(value, marshallOptions);
  
    const keys = Object.keys(key);
  
    Object.keys(value).forEach((entry: any) => {
      if (!keys.includes(entry)) {
        updateExpression = `${updateExpression} #${entry} = :${entry}, `;
        expressionAttributeNames[`#${entry}`] = entry;
        expressionAttributeValues[`:${entry}`] = valueMarshal[entry];
      }
    })
  
    updateExpression = updateExpression.substring(0, updateExpression.lastIndexOf(','));
  
    const params:any = {
      TableName: table,
      Key: AWS.DynamoDB.Converter.marshall(key),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'NONE'
    };

    if(conditionExpression) params.ConditionExpression = conditionExpression;
  
    await ddbClient.updateItem(params).promise();
}

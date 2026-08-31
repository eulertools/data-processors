const AWS = require('aws-sdk');

const ddbClient = new AWS.DynamoDB();

const marshallOptions:any = {
  convertClassInstanceToMap: true,
  removeUndefinedValues: true,
  convertEmptyValues: true,
};

export const updateItem = async (table: any, key: any, value: any) => {

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
  
    const params = {
      TableName: table,
      Key: AWS.DynamoDB.Converter.marshall(key),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    };
  
    await ddbClient.updateItem(params).promise();
}

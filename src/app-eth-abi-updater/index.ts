import { Context, SQSEvent } from 'aws-lambda';
import { updateDynamoDB } from './updateDynamoDB';

require('dotenv').config();
const Utils = require('web3-utils');

const chunk = 5;

const clean = (obj:any, removal:any) => {
  
  Object.keys(obj).forEach(key => {

      if (!removal.includes(key)) {
          if (typeof obj[key] === 'object') {

              obj[key] = clean(obj[key], removal);
          }
      } else {
          delete obj[key];
      }
  });

  return obj;
}

export async function handler(event: SQSEvent, context: Context):Promise<any> {

  console.log({ message: 'Retrieving records from the SQS Queue' });

  for (const record of event.Records) {
    // console.log("pre record", JSON.stringify(record))
    const message = JSON.parse(record.body);
    const abi = JSON.parse(message.Message);
    // console.log("parsed abi", abi)

    const methods = abi.filter((method:any) => method.type === 'function').map((method:any) => {
      method.inputs = method.inputs.map((input:any) => clean(input, ['internalType']));
      method.outputs = method.outputs.map((output:any) => clean(output, ['internalType']));
      method.header = Utils._jsonInterfaceMethodToString(method);
      method.signature = Utils.sha3(method.header).substring(0,10);
      method.verified = 'Verified';
      method.function_name = method.name;
      method.kind = '';
      delete method.name
      delete method.type;
      return method;
    });

    for(let i = 0, j = methods.length; i < j; i += chunk) {
      const methodsChunk = methods.slice(i, i + chunk);

      await Promise.all(methodsChunk.map(async(method:any) => {

        await updateDynamoDB(process.env.TABLE_NAME, { 
          signature: method.signature, 
          header: method.header } ,
          method
        );

        console.log(`Load function ${method.signature} ${method.header}`)
      }));
    }
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Wallet Movements Enriched into S3`,
    }),
    statusCode: 200,
  };
}


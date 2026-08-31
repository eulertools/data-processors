import { Context, SQSEvent } from 'aws-lambda';
import axios from 'axios';
import config from "./config";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { web3Client } from './web3Clients';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const sqs = new AWS.SQS();

const clientDB = new DynamoDB({});

const FUNCTION_DEPOSIT = '0xd0e30db0';
const DEPOSIT = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c';
const WITHDRAW = '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65';

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true, 
};

const MAX_RESULTS = config.max_results;

const callApi = async(params:any, path:string):Promise<any> => {

  let batchs:{ start_block: number; end_block: number; count:number; results:any[] }[] = [];

  for(let i:number = params.start_block; i < params.end_block; i += params.range_block) {

      let j:number = i + params.range_block;

      if(j > params.end_block) j = params.end_block;

      const response = (await axios.create({baseURL:params.api_url}).get(
          `api?module=account&action=${path}&address=${params.address}&startblock=${i}&endblock=${j}&sort=asc&apikey=${params.api_key}`)).data;

      if(response.result === MAX_RESULTS) throw new Error('The response exceeds the maximum number of records');

      const tokens_transfers:any[] = []

      for (let i = 0, j = response.result.length; i < j; i += params.chunk_txs) {

        const txChunk = response.result.slice(i, i + params.chunk_txs);

        await Promise.all(txChunk.map(async (result:any) => {

          const { blockNumber, timeStamp, hash, from, to, value, gasUsed, gasPrice } = result;

          const tx = await web3Client.eth.getTransaction(hash);

          let { logs, status } = (await web3Client.eth.getTransactionReceipt(hash));

          const method = tx.input.substring(0,10);

          if(value !== '0' && status && tx.to.toLowerCase() !== config.weth_address) {

            tokens_transfers.push({
              block_number: blockNumber, 
              block_timestamp: timeStamp, 
              transaction_hash: hash,
              log_index: undefined,
              internal_trace: undefined,
              source_kind: 'tx',
              token_address: config.eth_address,
              wallet_address: params.address,
              from_address: from,
              to_address: to,
              value,
              method,
              transaction_to: tx.to.toLowerCase(),
              transaction_kind: '',
              price_usd: ''
            });
          }

          if(params.address === from) {
            tokens_transfers.push({
              block_number: blockNumber, 
              block_timestamp: timeStamp, 
              transaction_hash: hash,
              log_index: undefined,
              internal_trace: undefined,
              source_kind: 'gas',
              token_address: config.eth_address,
              wallet_address: params.address,
              from_address: from,
              to_address: '0x0000000000000000000000000000000000000000',
              value: web3Client.utils.toBN(gasUsed).mul(web3Client.utils.toBN(gasPrice)).toString(),
              method,
              transaction_to: tx.to.toLowerCase(),
              transaction_kind: 'gas',
              price_usd: ''
            });
          }

          logs = logs.filter((log:any) =>  (log.topics[0] === DEPOSIT ||  log.topics[0] === WITHDRAW) &&
            log.address.toLowerCase() === config.weth_address &&
            params.address === log.topics[1].replace('0x000000000000000000000000','0x').toLowerCase()
          );

          if(logs.length > 0) {

            logs.forEach((log:any) => {

            const deposit = log.topics[0] === DEPOSIT;

            tokens_transfers.push({
              block_number: blockNumber, 
              block_timestamp: timeStamp, 
              transaction_hash: hash,
              log_index: log.logIndex,
              internal_trace: undefined,
              source_kind: 'weth_transfer',
              token_address: config.eth_address,
              wallet_address: params.address,
              from_address: deposit ? params.address : log.address.toLowerCase(),
              to_address: deposit ? log.address.toLowerCase() : params.address,
              value: web3Client.utils.toBN(log.data).toString(),
              method,
              transaction_to: tx.to.toLowerCase(),
              transaction_kind: deposit ? 'weth-deposit' : 'weth-withdraw',
              price_usd: ''
            });

            tokens_transfers.push({
              block_number: blockNumber, 
              block_timestamp: timeStamp, 
              transaction_hash: hash,
              log_index: log.logIndex,
              internal_trace: undefined,
              source_kind: 'weth_transfer',
              token_address: log.address.toLowerCase(),
              wallet_address: params.address,
              from_address: deposit ? log.address.toLowerCase() : params.address,
              to_address: deposit ? params.address : log.address.toLowerCase(),
              value: web3Client.utils.toBN(log.data).toString(),
              method,
              transaction_to: tx.to.toLowerCase(),
              transaction_kind: deposit ? 'weth-deposit' : 'weth-withdraw',
              price_usd: ''
            });
          })
        }
      }));
    }

    batchs = batchs.concat({ start_block:i, end_block:j, count: response.result.length, results: tokens_transfers });
  }

  return batchs;
}

const uploadS3 = async (params:any, batchs:any[], prefix:string) => {

  for(const batch of batchs) {

    batch.results.sort((a:any, b:any) => {
      return a.block_timestamp - b.block_timestamp;
    });

    if(batch.results.length > 0) {
      let csv = Object.keys(batch.results[0]).toString() + '\n';

      batch.results.forEach((result:any) => {
        csv = csv + Object.values(result).toString() + '\n';
      });

      const uploadParams = { 
        Bucket: params.bucket_name, 
        Key: `rawData/tokens_transfers/${params.address}/${params.chain_id}/${prefix}/${batch.start_block}_${batch.end_block}.csv`, 
        Body: Buffer.from(csv,'utf8')
      };

      try {
        const data = await s3.upload(uploadParams).promise();
        console.log("Upload Success", data);
        const sqsParams = {
          MessageBody: JSON.stringify({
           s3: {
            Bucket: data.Bucket,
            Key: data.Key
           }
          }),
          QueueUrl: config.sqs_url
        };
        console.log("Send Message to SQS", await sqs.sendMessage(sqsParams).promise());

      } catch (err) {
        console.log(err)
        throw err;
      }
    }
  }

  const key = marshall({ identifier: params.address, blockchain: params.chain_id }, marshallOptions);

  const value = { 
    identifier: params.address, 
    blockchain: params.chain_id,
    last_block_txs: params.end_block
  }

  await updateDynamoDB(config.table_name, key, value);
}

const isEmptyParam = (value:any, message:any) => {

  if (value === undefined) {
    console.error({
      error: message,
      code: "ENV_MISSING",
      status: "ERROR"
    })
    return true;
  }

  return false;
}

const getCurrentCheckpoint = async (table:any, key:any) => {

  const search = {
    TableName: table,
    Key: marshall(key, marshallOptions),
  };

  const item:any = (await clientDB.getItem(search)).Item;

  return item?.last_block_txs ? unmarshall(item).last_block_txs : 0;
}

const updateDynamoDB = async (table:any, key:any, value:any) => {
    
  let updateExpression = "SET ";
  const expressionAttributeValues:any = {}

  const valueMarshal = marshall(value, marshallOptions);

  const keys = Object.keys(key);

  Object.keys(value).forEach((entry:any) => {
      if(!keys.includes(entry)) {
          updateExpression = `${updateExpression} ${entry} = :${entry} ,`;
          expressionAttributeValues[`:${entry}`] = valueMarshal[entry];
      }
  })

  updateExpression = updateExpression.substring(0, updateExpression.lastIndexOf(','));

  const params = {
      TableName: table,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues
  };

  await clientDB.updateItem(params);
}

export async function handler(event: SQSEvent, context: Context):Promise<any> {

  console.log({ message: 'Retrieving records from the SQS Queue' });

  for (const record of event.Records) {

    console.log("pre record", JSON.stringify(record))
    const message = JSON.parse(record.body);
    console.log("parsed message", message)
    const request = JSON.parse(message.Message);
    console.log("parsed request", request)

    const startBlock = await getCurrentCheckpoint(config.table_name, 
      { identifier: request.address, blockchain: config.chain_id });

    const endBlock = await web3Client.eth.getBlockNumber();

    const params = {
      address: request.address.toLowerCase(),
      start_block: startBlock,
      end_block: endBlock,
      api_url: config.api_url,
      api_key: config.api_key,
      range_block: config.range_block,
      chunk_txs: config.chunk_txs,
      chain_id: config.chain_id,
      bucket_name: config.bucket_name,
    }

    let error = false;
    error = isEmptyParam(params.address, 'Address is missing') || error;
    error = isEmptyParam(params.api_url, 'RPC is missing')  || error;
    error = isEmptyParam(params.api_url, 'Api URL is missing')  || error;
    error = isEmptyParam(params.api_key, 'API-KEY is missing')  || error;
    error = isEmptyParam(params.start_block, 'Start block is missing') || error;
    error = isEmptyParam(params.end_block, 'End block is missing') || error;
    error = isEmptyParam(params.range_block, 'Range block is missing') || error;
    error = isEmptyParam(params.chunk_txs, 'Chunk txs is missing') || error;
    error = isEmptyParam(params.chain_id, 'Chain ID is missing') || error;
    error = isEmptyParam(params.bucket_name, 'Bucket name is missing') || error;

    if(!error) {

      await uploadS3(params, await callApi(params, 'txlist'), 'txs');

    } else {
        throw new Error('Any params is missing')
    }
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Wallet Movements into S3`,
    }),
    statusCode: 200,
  };
}


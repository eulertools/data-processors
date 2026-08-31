import { Context, KinesisStreamEvent } from 'aws-lambda';
import { KinesisStreamRecord } from 'aws-lambda/trigger/kinesis-stream';
import snakecaseKeys from 'snakecase-keys';
import { Client } from '@opensearch-project/opensearch';
import * as DynamoDB from './dynamodb';
import * as Mapping from './mapping';

require('dotenv').config();

const Web3 = require('web3');

const web3 = new Web3(process.env.FULL_NODE);

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

const mappingNetwork:any[] = [
  { "source": "total_supply", "destination" : "total_supply" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "circulating_supply", "destination" : "circulating_supply" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "update_date", "destination" : "update_date_supply" , overwrite: true }
]

const mapping:any[] = [
  { "source": "total_supply", "destination" : "total_supply.euler" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "circulating_supply", "destination" : "circulating_supply.euler" , overwrite: true ,
  transform: (value:any) => value === 'NaN' ? null : Mapping.roundPrice(value) },
  { "source": "update_date", "destination" : "update_date_supply" ,overwrite: true }
]

const node = `https://${process.env.OS_DOMAIN}`;

const client = new Client({
  nodes:  [ node ],
  ssl: {
    rejectUnauthorized: false,
  },
  auth: {
    username: process.env.OS_USER as string,
    password: process.env.OS_PASSWORD as string
  },
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: false,
});

const methods = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Retrieving token records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  const transfers = records.filter(
    (receipt: any) =>
      receipt.value > 0 
      &&  ('0x0000000000000000000000000000000000000000' === receipt.from_address.toLowerCase() || 
      '0x0000000000000000000000000000000000000000' === receipt.to_address.toLowerCase() ||
      '0x000000000000000000000000000000000000dead' === receipt.to_address.toLowerCase())
  );

  const mappedTransfers = await Promise.all(transfers.map(async (transfer: any) => {
    let total_supply, circulating_supply;

    try {

      const contract = new web3.eth.Contract(methods, transfer.token_address);
      
      const balanceDeadPromise = contract.methods['balanceOf']('0x0000000000000000000000000000000000000000').call();
      const balanceZeroPromise = contract.methods['balanceOf']('0x000000000000000000000000000000000000dead').call();
      const decimalsPromise = contract.methods['decimals']().call();
      const totalSupplyPromise = contract.methods['totalSupply']().call();

      const [ balanceDead, balanceZero, totalSupply, decimal ] = await Promise.all([
        balanceDeadPromise, balanceZeroPromise, totalSupplyPromise, decimalsPromise
      ]);

      total_supply = totalSupply / 10 ** decimal;

      circulating_supply = Number((web3.utils.toBN(totalSupply)
        .sub(web3.utils.toBN(balanceDead))
        .sub(web3.utils.toBN(balanceZero))).toString()) / 10 ** decimal;

    } catch (e) {
      Sentry.captureException({message: 'Error occured',
        hash: transfer.transaction_hash,
        log_index: transfer.log_index,
        error: JSON.stringify(e),
        blockChain: process.env.CHAIN_ID, 
        object: 'tokens'
      })
      console.log({message: 'Error',
        hash: transfer.transaction_hash,
        log_index: transfer.log_index,
        error: e,
        blockChain: process.env.CHAIN_ID, 
        object: 'tokens'
      });
      return null;
    }
    
    return {
      chain: process.env.CHAIN_ID,
      address: transfer.token_address.toLowerCase(), 
      total_supply,
      circulating_supply,
      update_date: new Date().toISOString()
    };
  }));
  
  const filteredTransfers = mappedTransfers.filter((el: any) => el);

  try {
    if(filteredTransfers.length > 0) {

      console.log('transfers', filteredTransfers);

      await Promise.all(filteredTransfers.map(async (token:any) => {

        try {

          const params:any = {
            index: process.env.OS_INDEX,
            body: {
              query: {
                match_phrase: {}
              }
            }
          }

          params.body.query.match_phrase[`networks.${token.chain}.address`] = token.address;

          const id = (await client.search(params)).body?.hits?.hits[0]?._id;

          if(id) {

            const result = await DynamoDB.getItem({
              TableName: process.env.CATALOG_DDB_TABLE,
              KeyConditionExpression: '#identifier  = :identifier',
              FilterExpression: '#source = :source',
              ExpressionAttributeNames:{
                  '#identifier': 'identifier',
                  '#source': 'source',
              },
              ExpressionAttributeValues: {
                ':identifier': { S: `${id}` },
                ':source': { S: 'euler' },
              },
              ScanIndexForward: false,
            });

            const key = {
              identifier: result.identifier,
              update_date: Math.round(new Date().getTime() / 1000)
            }

            delete result.identifier;
            delete result.update_date;
        
            const value = {
              ...key,
              ...result,
            }
        
            value.readable_update_date = new Date().toISOString();

            Mapping.merge(token, value.networks[token.chain], mappingNetwork);

            let total_supply = 0;
            let circulation_supply = 0;

            Object.values(value.networks).forEach((network:any) => {
              if(network.total_supply) total_supply += network.total_supply
              if(network.circulation_supply) circulation_supply += network.circulation_supply
            })

            Mapping.merge({ 
              update_date: token.update_date,
              total_supply, 
              circulation_supply 
            }, value, mapping);

            await DynamoDB.updateItem(process.env.CATALOG_DDB_TABLE,key, value, null);
          }
        } catch (e) { console.log(e); }
      }))
    }

  } catch (e) {
    Sentry.captureException({message: 'Error occured while inserting token records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
    throw {message: 'Insert token records failed:', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'};
  }
  return {
    body: JSON.stringify({ message: 'Successful lambda invocation' }),
    statusCode: 200,
  };
};

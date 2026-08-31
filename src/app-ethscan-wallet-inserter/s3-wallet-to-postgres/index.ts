import { Context, SQSEvent } from 'aws-lambda';
import * as utils from 'web3-utils';
import config from './config';
import { EntityWalletTransfer } from './model/EntityWalletTransfer';
// import { QueryTypes } from 'sequelize';
// import config from './config';
import translateInput from './translate_input';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const getKind = (transfer:any) => {

  if(transfer.to_address === '0x000000000000000000000000000000000000dead' || 
    transfer.to_address === '0x0000000000000000000000000000000000000000') {
      return 'burn';
  }

  const kind = translateInput[transfer.method];

  return kind;
}

const csvToList = (buf:Buffer) => {
  const lines:string[] = buf.toString('utf8').split('\n');
  const header:string = lines.shift()!;
  const listColumns = header.split(',');
  const numberColumns = listColumns.length;

  const list:any[] = [];

  lines.forEach(line => {

    const columns = line.split(',');

    if(columns.length === numberColumns) {
     
      const obj:any = {};
  
      for(let i = 0; i < numberColumns; i++) {
        obj[listColumns[i]] = columns[i];
      }
  
      list.push(obj);
    }
  });

  return { header , list };
}

const recordToWalletTransfer = (record:any) => {

  let transfer_hash:any = `${record.transaction_hash}:${record.wallet_address}:${record.token_address}:${record.source_kind}`;

  if(record.source_kind === 'token_transfer' || record.source_kind === 'weth_transfer') {
    transfer_hash = `${transfer_hash}:${record.log_index}`;
  } else if(record.source_kind === 'internal_tx') {
    transfer_hash = `${transfer_hash}:${record.internal_trace}`;
  }

  transfer_hash = utils.sha3(transfer_hash);

  return {
    block_number: record.block_number,
    block_timestamp: new Date(record.block_timestamp * 1000),
    transaction_hash: record.transaction_hash,
    transfer_hash,
    source_kind: record.source_kind,
    token_address: record.token_address,
    wallet_address: record.wallet_address,
    from_address: record.from_address,
    to_address: record.to_address,
    value: record.wallet_address === record.from_address ? record.value * -1 : record.value,
    transaction_kind: record.transaction_kind
  }
}

export async function handler(event: SQSEvent, context: Context):Promise<any> {

  console.log({ message: 'Retrieving records from the SQS Queue' });

  for (const record of event.Records) {
    console.log("pre record", JSON.stringify(record))
    const message = JSON.parse(record.body);
    console.log("parsed message", message)
    const { Bucket, Key} = message.s3;

    const params = { Bucket, Key };
    
    const buf = (await s3.getObject(params).promise()).Body;

    const { list } = csvToList(buf);

    const { chunk_txs } = config;

    for(let i = 0, j = list.length; i < j; i += chunk_txs) {

      const transfersChunk = list.slice(i, i + chunk_txs);

      const bulk:any = await Promise.all(transfersChunk.map(async(transfer) => {

        const walletTransfer:any = recordToWalletTransfer(transfer);

        if(!walletTransfer.transaction_kind) {
          walletTransfer.transaction_kind = getKind(transfer);
        }
        return walletTransfer;
      }));
      
      await EntityWalletTransfer.bulkCreate(bulk, {
        returning: false,
        updateOnDuplicate: ['transfer_hash','block_timestamp']
      }).catch(console.log);
    }
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Wallet Movements Enriched into Postgres`,
    }),
    statusCode: 200,
  };
}


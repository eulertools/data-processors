import { Context, KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import snakecaseKeys from 'snakecase-keys';
import { getPairData } from './getPairData';
import { tradeMapper } from './tradeMapper';
// @ts-ignore
import _ from 'lodash';
import { web3Client } from './web3Clients';
import {PutRecordsCommand, KinesisClient} from '@aws-sdk/client-kinesis';
import {toObject} from './toObject';

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

export async function handler(event: KinesisStreamEvent, context?: Context) {
  const kinesisClient = new KinesisClient({region: process.env.AWS_REGION})
  console.log({message: 'Retrieving trades records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  const tradesPromises = records.map(async (swap: any) => {
    const address = web3Client.utils.toChecksumAddress(swap.address);
    console.log({message: 'Getting pairs data...'});
    const pairData = await getPairData(address);

    if (pairData) {
      return tradeMapper(swap, pairData);
    }
    return null;
  });

  const results = await Promise.all(tradesPromises)
  const filteredResults = results.filter((el: any)=>el).map((result) => {
    return {
      Data: Buffer.from(JSON.stringify(toObject(result))),
      PartitionKey: `TRADES-${new Date().getTime()}`,
    }
  })

  console.log({message: 'Trades', data: results, blockChain: process.env.CHAIN_ID, object: 'trades'})

  if (filteredResults.length > 1) {
    let i, j, logBatch;
    for (i = 0, j = filteredResults.length; i < j; i += 25) {
      logBatch = filteredResults.slice(i, i + 25);
      await kinesisClient
        .send(
          new PutRecordsCommand({
            Records: logBatch,
            StreamName: process.env.STREAM_NAME,
          })
        )
        .catch((e) => {
          Sentry.captureException({message: 'Error occured while streaming trades into kinesis', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
          console.log({message: 'Error streaming trades to kinesis', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'trades'})
          throw e
        })
    }
  }

  return {
    status: 200,
    message: 'Lambda worked',
  };
};

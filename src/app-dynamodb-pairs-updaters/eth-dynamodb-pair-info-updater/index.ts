import { Context, KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import { updatePairInformation } from './updatePairInformation';

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Retrieving records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    try {
      return JSON.parse(payload);
    } catch (e) {
      Sentry.captureException({message: 'Error occured while parsing records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Error occured while parsing records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      return {}
    }
  }).filter((el)=> el.address);

  // @ts-ignore
  const updates = records.map(async (trade: any) => {
    try {
      return updatePairInformation(trade);
    } catch (e) {
      Sentry.captureException({message: 'Error occured while updating pairs records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'failed updates of pairs, error occured: ', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      return null
    }
  }).filter((el)=>el);

  try {
    await Promise.all(updates);
  } catch (e) {
    Sentry.captureException({message: 'Failed to update pairs records: ', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
    console.log({message: 'Failed to update pairs records: ', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
  }

  return {
    status: 200,
    message: 'Lambda worked',
  };
};

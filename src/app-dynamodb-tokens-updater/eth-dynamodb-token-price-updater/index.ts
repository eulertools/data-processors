import {Context, KinesisStreamEvent, KinesisStreamRecord} from 'aws-lambda';
import {updateTokenPrice} from './updateTokenPrice';

const _ = require('lodash');

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
      return null
    }
  }).filter((el)=>el);

  const trades = _.chain(records)
    .filter((el: { price_usd: number }) => el.price_usd && el.price_usd > 0)
    .sortBy('block_timestamp')
    .uniqBy('quoted_token')
    .value();

  const updates = trades.map(async (trade: any) => {
    try {
      return updateTokenPrice(trade);
    } catch (e) {
      Sentry.captureException({message: 'Error occured while updating token price', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
      console.log({message: 'failed updates of token price, error occured: ', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
    }
  });

  try {
    await Promise.all(updates);
  } catch(e) {
    Sentry.captureException({message: 'Failed to update token records: ', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
    console.log({message: 'Failed to update token records: ', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'})
    throw e
  }

  return {
    status: 200,
    message: 'Lambda worked',
  };
};

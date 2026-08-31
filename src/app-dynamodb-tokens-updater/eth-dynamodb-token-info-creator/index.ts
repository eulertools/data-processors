import {Context, KinesisStreamEvent, KinesisStreamRecord} from 'aws-lambda';
import snakecaseKeys from 'snakecase-keys';
import {createAddress} from './createAddress';
import {createToken} from './createToken';

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Retrieving records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  const promises = records.map(async (tokenCreated: any) => {

    let address, token;

    try {
      console.log({message: 'Creating Token...'});
      token = await createToken(tokenCreated)
    } catch (e) {
      Sentry.captureException({message: 'Error occured while creating token', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
      console.log({message: 'creating token failed: ', error: [tokenCreated.address, JSON.stringify(tokenCreated), e], blockChain: process.env.CHAIN_ID, object: 'tokens'})
      throw(e)
    }

    try {
      console.log({message: 'Creating Address...'});
      address = await createAddress(token)
    } catch (e) {
      Sentry.captureException({message: 'Error occured while creating dddress', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
      console.log({message: 'creating address failed: ', error: [tokenCreated.address, JSON.stringify(tokenCreated), e], blockChain: process.env.CHAIN_ID, object: 'tokens'})
      throw(e)
    }

    return await Promise.all([address, token])
  })

  await Promise.all(promises)

  return {
    status: 200,
    message: 'Lambda worked'
  }
}

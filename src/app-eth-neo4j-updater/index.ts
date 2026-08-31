import {Context, KinesisStreamEvent} from 'aws-lambda';
import {KinesisStreamRecord} from 'aws-lambda/trigger/kinesis-stream';
import {EXCHANGES} from './exchanges';
import { updateLiquidity } from './updateLiquidity';

const _ = require('lodash');
const neo4j = require('neo4j-driver');
const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

console.log({message: 'Connecting to neo4j database....'});

const {uri, user, password} = JSON.parse(process.env.DB_CREDS as string);

const exchanges = _.chain(EXCHANGES)
  .map((exchange: any) => {
    return {...exchange, factory: exchange.factory.toLowerCase()};
  })
  .keyBy('factory')
  .value();

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

console.log({message: 'Connected....'});

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Retrieving records from the kinesis stream'});
  const syncs = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    try {
      return JSON.parse(payload);
    } catch (e) {
      Sentry.captureException({message: 'Error occured while parsing records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Error occured while parsing records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID})
      return
    }
  }).filter((el)=>el);

  console.log({message: 'Syncs', data: syncs, blockChain: process.env.CHAIN_ID})

  const results = syncs.filter((el)=>el.pair_data).map(async (sync: any) => {
    const base_reserves =
      sync.reserve0 === 0 ? 0 : sync.reserve0 / 10 ** sync.pair_data.base_token_decimals;
    const quote_reserves =
      sync.reserve1 === 0 ? 0 : sync.reserve1 / 10 ** sync.pair_data.quote_token_decimals;

    console.log({message: 'Syncs Pair', data: sync.pair_data })

    const data = {
      address: sync.address.toLowerCase(),
      base_reserves,
      quote_reserves,
      ratio_base: base_reserves === 0 ? 0 : quote_reserves / base_reserves,
      ratio_quote: quote_reserves === 0 ? 0 : base_reserves / quote_reserves,
      base_token: sync.pair_data.base_token_address?.toLowerCase(),
      base_token_symbol: sync.pair_data.base_token_symbol?.toUpperCase(),
      quote_token: sync.pair_data.quote_token_address?.toLowerCase(),
      quote_token_symbol: sync.pair_data.quote_token_symbol?.toUpperCase(),
      last_update: sync.block_timestamp,
      ...exchanges[sync.pair_data.factory_address?.toLowerCase()],
    };

    try {
      const session = driver.session();
        let query = `MERGE (c:Token {address: '${data.base_token}'})
                       MERGE (s:Token {address: '${data.quote_token}'})
                       MERGE (c)-[r:Pool {address: '${data.address}',
                                      base_token: '${data.base_token}',
                                      quote_token: '${data.quote_token}'}]->(s) 
                       SET r.base_reserves =  ${data.base_reserves}
                       SET r.quote_reserves =  ${data.quote_reserves}
                       SET r.ratio_base = ${data.ratio_base}
                       SET r.ratio_quote =  ${data.ratio_quote}
                       SET r.last_update = ${data.last_update}`;

      if (data.fees) {
        query = `${query} SET r.fees = ${data.fees}`
      }

      if (data.factory) {
        query = `${query} SET r.factory = '${data.factory}'`
      }

      if (data.percentage) {
        query = `${query} SET r.percentage = ${data.percentage}`
      }

      if (data.proxy) {
        query = `${query} SET r.proxy = '${data.proxy}'`
      }
      
      const result = await session.run(query);

      console.log({message: 'Results', data: JSON.stringify(result)});
      await updateLiquidity(session, data.base_token);
      await updateLiquidity(session, data.quote_token);

      return result;

    } catch (e) {
      Sentry.captureException({message: 'Error occured', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
          console.log({message: 'Error occured', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
    }
  })

  await Promise.all(results);
}

import { Context, KinesisStreamEvent } from 'aws-lambda';
import { DataTypes } from 'sequelize';
import { KinesisStreamRecord } from 'aws-lambda/trigger/kinesis-stream';
import snakecaseKeys from 'snakecase-keys';

const Sequelize = require('sequelize');
const pg = require('pg');
const Sentry = require('@sentry/serverless');

const dbCreds = JSON.parse(process.env.DB_CREDS as string);

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

const sequelize = new Sequelize({
  username: dbCreds.username,
  password: dbCreds.password,
  port: dbCreds.port,
  host: dbCreds.host,
  database: process.env.DB_NAME,
  dialect: 'postgres',
  protocol: 'postgres',
  define: {
    timestamps: false,
  },
  dialectOptions: {
    dialectModule: pg,
    connectTimeout: 35000,
    application_name: `blocks-inserter`,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export const SBlock = sequelize.define(
  'blocks',
  {
    number: { type: DataTypes.BIGINT, primaryKey: true },
    hash: { type: DataTypes.STRING, primaryKey: true },
    parent_hash: { type: DataTypes.STRING },
    nonce: { type: DataTypes.STRING },
    sha3_uncles: { type: DataTypes.STRING },
    logs_bloom: { type: DataTypes.TEXT },
    transactions_root: { type: DataTypes.STRING },
    state_root: { type: DataTypes.STRING },
    receipts_root: { type: DataTypes.STRING },
    miner: { type: DataTypes.STRING },
    difficulty: { type: DataTypes.BIGINT },
    total_difficulty: { type: DataTypes.BIGINT },
    size: { type: DataTypes.BIGINT },
    extra_data: { type: DataTypes.TEXT },
    gas_limit: { type: DataTypes.BIGINT },
    gas_used: { type: DataTypes.BIGINT },
    timestamp: { type: DataTypes.DATE },
    transaction_count: { type: DataTypes.BIGINT, allowNull: false },
  },
  {
    schema: 'raw',
  }
);

export async function handler(event: KinesisStreamEvent, context: Context) {
  console.log({message: 'Connecting to the database.....'})
  await sequelize.authenticate();
  console.log({message: 'Connected to database successfully...'});
  console.log({message: 'Retrieving blocks records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  try {
    console.log({message: 'Inserting blocks records into database...'});
    await SBlock.bulkCreate(records, { returning: false, ignoreDuplicates: true });
    console.log({message: 'Blocks records are inserted successfully into database.', blockChain: process.env.CHAIN_ID, object: 'blocks'});
  } catch (e) {
    Sentry.captureException({message: 'Error occured while inserting records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'blocks'})
    throw {message: 'Insert blocks records failed:', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'blocks'};
  }

  return {
    body: JSON.stringify({ message: 'Successful lambda invocation' }),
    statusCode: 200,
  };
};

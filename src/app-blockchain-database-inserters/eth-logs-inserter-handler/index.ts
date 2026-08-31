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
    application_name: `logs-inserter`,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export const SLog = sequelize.define(
  'logs',
  {
    log_index: { type: DataTypes.BIGINT, primaryKey: true, allowNull: false },
    transaction_hash: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    transaction_index: { type: DataTypes.BIGINT, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    data: { type: DataTypes.TEXT, allowNull: true },
    topic0: { type: DataTypes.STRING, allowNull: true },
    topic1: { type: DataTypes.STRING, allowNull: true },
    topic2: { type: DataTypes.STRING, allowNull: true },
    topic3: { type: DataTypes.STRING, allowNull: true },
    block_timestamp: { type: DataTypes.TIME, allowNull: true },
    block_number: { type: DataTypes.BIGINT, allowNull: true },
    block_hash: { type: DataTypes.STRING, allowNull: true },
  },
  {
    schema: 'raw',
  }
);

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Connecting to the database.....'})
  await sequelize.authenticate();
  console.log({message: 'Connected to database successfully...'});
  console.log({message: 'Retrieving logs records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  try {
    console.log({message: 'Inserting logs records into database...'});
    await SLog.bulkCreate(records, { returning: false, ignoreDuplicates: true });
    console.log({message: 'Logs records are inserted successfully into database.', blockChain: process.env.CHAIN_ID, object: 'logs'});
  } catch (e) {
    Sentry.captureException({message: 'Error occured while inserting logs records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'logs'})
    throw {message: 'Insert logs records failed:', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'logs'};
  }

  return {
    body: JSON.stringify({ message: 'Successful lambda invocation' }),
    statusCode: 200,
  };
};

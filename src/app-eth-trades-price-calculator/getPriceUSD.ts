import {chainConfig} from "./fixtures";
import {QueryTypes} from "sequelize";

const Redis = require("ioredis");

const Sequelize = require('sequelize')
const pg = require('pg')

const dbCreds = JSON.parse(process.env.DB_CREDS as string)

const timescale = new Sequelize({
  username: dbCreds.username,
  password: dbCreds.password,
  port: dbCreds.port,
  host: dbCreds.host.replace("cluster-", "cluster-ro-"),
  database: process.env.DB_NAME,
  dialect: 'postgres',
  protocol: 'postgres',
  define: {
    timestamps: false
  },
  dialectOptions: {
    dialectModule: pg,
    connectTimeout: 35000,
    application_name: `price-usd-calculator`,
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    "statement_timeout": 10000,
    "idle_in_transaction_session_timeout": 20000
  }
})

const redis = new Redis(`redis://${process.env.REDIS_URL!}:6379`);

export const getPriceUSD = async (address: string, timestamp: any) => {
  const {wad_stable_pair, stable_coins} = chainConfig()
  const datetime = new Date(timestamp)

  let res = await redis.get(`cache:${address.toLowerCase()}:${datetime.getTime()}`);
  let price = parseFloat(res);

  if (price) {
    return price
  }

  let quote_conditions;
  if (address.toLowerCase() === wad_stable_pair.wad_address.toLowerCase()) {
    quote_conditions = `ANY (ARRAY${JSON.stringify(stable_coins).replace(
      /"/g,
      "'"
    )})`;
  } else {
    quote_conditions = `'${wad_stable_pair.wad_address.toLowerCase()}'`;
  }

  let token_condition = `(
                     (base_token = LOWER('${address}') AND
                      quote_token =  ${quote_conditions})
                     OR
                     (quote_token = LOWER('${address}') AND
                      base_token =  ${quote_conditions})
                   )`;

  const query = `SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY p.price_usd) as price_usd
                 FROM (SELECT block_timestamp as time, price_usd
                       FROM raw.trades
                       WHERE ${token_condition}
                         AND block_timestamp BETWEEN '${timestamp}'::timestamp - INTERVAL '10 MINUTE' AND '${timestamp}'::timestamp
                       ORDER BY block_timestamp desc
                       LIMIT 100) as p;`

  const [results, meta] = await timescale.query(query, {raw: true, type: QueryTypes.SELECT})

  if (results && results.price_usd) {
    price = parseFloat(results.price_usd)
  } else {
    price = 0.0
  }

  await redis.set(`cache:${address.toLowerCase()}:${datetime.getTime()}`, price)
  await redis.expire(`cache:${address.toLowerCase()}:${datetime.getTime()}`, 600)

  return price;
}

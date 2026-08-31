#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppEthscanStakingInserterStack } from '../lib/app-ethscan-staking-inserter-stack';

const app = new cdk.App();

new AppEthscanStakingInserterStack(app, 'bscscan-staking-collector', {
  chain_id: 'bsc',
  rpc: 'https://bsc-dataseed.binance.org/',
  api_url: 'https://api.bscscan.com',
  api_key: 'RQPG2ZP1B7TBK1HUJH7REH5FZYHEC8IBGB',
  description: 'Data Collectors from BSCScan to Postgres',
  tags: { network: 'bsc', usage: 'data-event-collector' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

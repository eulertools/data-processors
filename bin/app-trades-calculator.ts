#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { ETHPricesStream } from '../lib/eth-prices-stream';

const app = new App();

new ETHPricesStream(app, 'eth-trades-stream', {
  vpcId: 'VPC_ID',
  servicesSG: 'SECURITY_GROUP_ID',
  resourcesSG: 'SECURITY_GROUP_ID',
  chainId: 'eth',
  catalogDdb: 'eth_catalog',
  description: 'Streams ethereum trades to prices stream',
  tags: { network: 'eth', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new ETHPricesStream(app, 'bsc-trades-stream', {
  vpcId: 'VPC_ID',
  servicesSG: 'SECURITY_GROUP_ID',
  resourcesSG: 'SECURITY_GROUP_ID',
  chainId: 'bsc',
  catalogDdb: 'catalog',
  description: 'Streams Binance Smart Chain trades to prices stream',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

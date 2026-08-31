#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import {EthTokenTransfersInserters} from '../lib/eth-token-transfers-inserters';

const app = new App();

new EthTokenTransfersInserters(app, 'bsc-token-transfers-inserters', {
  chainId: 'bsc',
  description: 'Inserts Binance Smart Chain token transfers in aurora',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new EthTokenTransfersInserters(app, 'eth-token-transfers-inserters', {
  chainId: 'eth',
  description: 'Inserts Ethereum token transfers in aurora',
  tags: { network: 'eth', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

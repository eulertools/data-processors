#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppETHScanWalletCollectorStack } from '../lib/app-ethscan-wallet-collector-stack';

const app = new cdk.App();

new AppETHScanWalletCollectorStack(app, 'BSCScanWalletCollector', {
  chain_id: 'bsc',
  rpc: 'https://bsc-dataseed.binance.org/',
  api_url: 'https://api.bscscan.com',
  api_key: 'RQPG2ZP1B7TBK1HUJH7REH5FZYHEC8IBGB',
  bucket_name: "evm-wallets",
  eth_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  weth_address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  description: 'Data Collectors from BSCScan to S3',
  tags: { network: 'bsc', usage: 'data-event-collector' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

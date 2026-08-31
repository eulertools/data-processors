import { Duration, Stack, StackProps, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

interface EthscanCollectorProps extends StackProps {
  chain_id: string;
  rpc: string;
  api_url: string;
  api_key: string;
  bucket_name: string;
  eth_address:string;
  weth_address:string;
}

export class AppETHScanWalletCollectorStack extends Stack {
  constructor(scope: Construct, id: string, props?: EthscanCollectorProps) {
    super(scope, id, props);

    const {
      chain_id,
      rpc,
      api_url,
      api_key,
      bucket_name,
      eth_address,
      weth_address
    } = props!;

    const bucket = s3.Bucket.fromBucketName(
      this,
      'evm-wallets-bucket',
      bucket_name,
    );

    const table_name = Fn.importValue('evm-wallet-control-tablename')

    const table = dynamodb.Table.fromTableName(this, 'evmWalletControlDynamoDB',table_name);

    const s3ToPostgresQueue = new sqs.Queue(
      this,
      `${chain_id}S3WalletToPostgresQueue`,
      {
        queueName: `${chain_id}-s3-to-postgres-events`,
        visibilityTimeout: Duration.seconds(300),
      }
    );

    const ethscanInsertTopic = new sns.Topic(this, 'Topic', 
      {
        topicName: 'ethscan-wallet-insert',
      }
    );
    
    const ethScanWalletTxsQueue = new sqs.Queue(
      this,
      `${chain_id}EthScanWalletTxsQueue`,
      {
        queueName: `${chain_id}-ethscan-wallet-txs-events`,
        visibilityTimeout: Duration.seconds(300),
      }
    );

    ethscanInsertTopic.addSubscription(
      new subscriptions.SqsSubscription(ethScanWalletTxsQueue)
    );

    const txsFunction = new NodejsFunction(this, `${chain_id}EthScanTxsFunction`, {
      description: 'Retrieves all information of wallet from ethscan and load to s3',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'handler',
      functionName: `${chain_id}-ethscan-wallet-txs-s3`,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../src/app-ethscan-wallet-inserter/ethscan-wallet-tx/index.ts`),
      bundling: {
        minify: true,
        externalModules: ['electron'],
      },
      environment: {
        NETWORK_ID: chain_id,
        NETWORK_API: api_url,
        NETWORK_RPC: rpc,
        NETWORK_API_KEY: api_key,
        NETWORK_TOKEN_ADDRESS: eth_address,
        NETWORK_WRAPPER_TOKEN_ADDRESS: weth_address,
        BUCKET_NAME: bucket_name,
        TABLE_NAME: table_name,
        SQS_URL: s3ToPostgresQueue.queueUrl
      }
    });

    bucket.grantReadWrite(txsFunction);
    table.grantReadWriteData(txsFunction);
    s3ToPostgresQueue.grantSendMessages(txsFunction);

    const txsFnEventSource = new lambdaEventSources.SqsEventSource(ethScanWalletTxsQueue,
      {
        batchSize: 1,
        enabled: true
      }
    );

    txsFunction.addEventSource(txsFnEventSource);

    const ethScanWalletTokensQueue = new sqs.Queue(
      this,
      `${chain_id}EthScanWalletTokensQueue`,
      {
        queueName: `${chain_id}-ethscan-wallet-tokens-events`,
        visibilityTimeout: Duration.seconds(300),
      }
    );

    ethscanInsertTopic.addSubscription(
      new subscriptions.SqsSubscription(ethScanWalletTokensQueue)
    );

    const tokensFunction = new NodejsFunction(this, `${chain_id}EthScanTokensFunction`, {
      description: 'Retrieves all information of wallet from ethscan and load to s3',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'handler',
      functionName: `${chain_id}-ethscan-wallet-tokens-s3`,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../src/app-ethscan-wallet-inserter/ethscan-wallet-tokens/index.ts`),
      bundling: {
        minify: true,
        externalModules: ['electron'],
      },
      environment: {
        NETWORK_ID: chain_id,
        NETWORK_API: api_url,
        NETWORK_RPC: rpc,
        NETWORK_API_KEY: api_key,
        NETWORK_TOKEN_ADDRESS: eth_address,
        BUCKET_NAME: bucket_name,
        TABLE_NAME: table_name,
        SQS_URL: s3ToPostgresQueue.queueUrl
      }
    });

    const tokensFnEventSource = new lambdaEventSources.SqsEventSource(ethScanWalletTokensQueue,
      {
        batchSize: 1,
        enabled: true
      }
    );

    tokensFunction.addEventSource(tokensFnEventSource);

    bucket.grantReadWrite(tokensFunction);
    table.grantReadWriteData(tokensFunction);
    s3ToPostgresQueue.grantSendMessages(tokensFunction);

    const internalTxsQueue = new sqs.Queue(
      this,
      `${chain_id}EthScanWalletInternalTxsQueue`,
      {
        queueName: `${chain_id}-ethscan-wallet-internal-txs-events`,
        visibilityTimeout: Duration.seconds(300),
      }
    );

    ethscanInsertTopic.addSubscription(
      new subscriptions.SqsSubscription(internalTxsQueue)
    );

    const internalTxsFunction = new NodejsFunction(this, `${chain_id}EthScanInternalTxsFunction`, {
      description: 'Retrieves all information of wallet from ethscan and load to s3',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'handler',
      functionName: `${chain_id}-ethscan-wallet-internaltx-s3`,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../src/app-ethscan-wallet-inserter/ethscan-wallet-internaltx/index.ts`),
      bundling: {
        minify: true,
        externalModules: ['electron'],
      },
      environment: {
        NETWORK_ID: chain_id,
        NETWORK_API: api_url,
        NETWORK_RPC: rpc,
        NETWORK_API_KEY: api_key,
        NETWORK_TOKEN_ADDRESS: eth_address,
        NETWORK_WRAPPER_TOKEN_ADDRESS: weth_address,
        BUCKET_NAME: bucket_name,
        TABLE_NAME: table_name,
        SQS_URL: s3ToPostgresQueue.queueUrl
      }
    });

    const internalTxsFnEventSource = new lambdaEventSources.SqsEventSource(internalTxsQueue,
      {
        batchSize: 1,
        enabled: true
      }
    );

    internalTxsFunction.addEventSource(internalTxsFnEventSource);

    bucket.grantReadWrite(internalTxsFunction);
    table.grantReadWriteData(internalTxsFunction);
    s3ToPostgresQueue.grantSendMessages(internalTxsFunction);

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      "DatabaseCredentials",
      `databases/chain/${chain_id}`
    );

    const insertPostgresFunction = new NodejsFunction(this, `${chain_id}S3WallettoPostgresFunction`, {
      description: 'Retrieves all information of wallet from S3 and load to Postgres',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'handler',
      functionName: `${chain_id}-s3-wallet-to-postgres`,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../src/app-ethscan-wallet-inserter/s3-wallet-to-postgres/index.ts`),
      bundling: {
        minify: true,
        externalModules: ['electron'],
        nodeModules: ["pg"]
      },
      environment: {
        NETWORK_ID: chain_id,
        DB_CREDS: dbcreds.secretValue.toString(),
        DB_NAME: 'mainnet'
      }
    });

    const insertPostgresFnEventSource = new lambdaEventSources.SqsEventSource(s3ToPostgresQueue,
      {
        batchSize: 1,
        enabled: true
      }
    );

    insertPostgresFunction.addEventSource(insertPostgresFnEventSource);
    bucket.grantReadWrite(insertPostgresFunction);
  }
}

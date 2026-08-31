import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Stack, StackProps } from 'aws-cdk-lib';

interface EthInserterProps extends StackProps {
  chainId: string;
}

export class EthDatabaseInserters extends Stack {
  constructor(scope: App, id: string, props?: EthInserterProps) {
    super(scope, id, props);

    const { chainId } = props!;

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseCredentials',
      `databases/${chainId}`
    );

    const logsStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}LogsStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-logs`
    );

    const logsInserterFunction = new NodejsFunction(this, 'LogsInserterHandler', {
      description: 'Inserts the logs into the database',
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-logs-inserter-handler`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        DB_CREDS: dbcreds.secretValue.toString(),
        CHAIN_ID: chainId
      },
      bundling: {
        minify: true,
        externalModules: [],
        nodeModules: ['pg'],
      },
      entry: path.join(__dirname, `/../src/app-blockchain-database-inserters/eth-logs-inserter-handler/index.ts`),
    });

    logsStream.grantRead(logsInserterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(logsStream, {
      batchSize: 200,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    logsInserterFunction.addEventSource(logsEventSource);

    const transactionsStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}TransactionsStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-transactions`
    );

    const transactionsInserterFunction = new NodejsFunction(this, 'TransactionsInserterHandler', {
      description: 'Inserts the transactions into the database',
      memorySize: 512,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-transactions-inserter-handler`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        DB_CREDS: dbcreds.secretValue.toString(),
        CHAIN_ID: chainId
      },
      bundling: {
        minify: true,
        externalModules: [],
        nodeModules: ['pg'],
      },
      entry: path.join(__dirname, `/../src/app-blockchain-database-inserters/eth-transactions-inserter-handler/index.ts`),
    });

    transactionsStream.grantRead(transactionsInserterFunction);

    const transactionsEventSource = new lambdaEventSources.KinesisEventSource(transactionsStream, {
      batchSize: 200,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    transactionsInserterFunction.addEventSource(transactionsEventSource);

    const blocksStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}BlocksStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-blocks`
    );

    const blocksInserterFunction = new NodejsFunction(this, 'BlocksInserterHandler', {
      description: 'Inserts the blocks into the database',
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-blocks-inserter-handler`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        DB_CREDS: dbcreds.secretValue.toString(),
        CHAIN_ID: chainId
      },
      bundling: {
        minify: true,
        externalModules: [],
        nodeModules: ['pg'],
      },
      entry: path.join(__dirname, `/../src/app-blockchain-database-inserters/eth-blocks-inserter-handler/index.ts`),
    });

    blocksStream.grantRead(blocksInserterFunction);

    const blocksEventSource = new lambdaEventSources.KinesisEventSource(blocksStream, {
      batchSize: 500,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    blocksInserterFunction.addEventSource(blocksEventSource);
  }
}

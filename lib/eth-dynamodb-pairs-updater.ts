import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface EthDynamoProps extends StackProps {
  chainId: string;
  catalogDdb: string;
}

export class EthDynamodbPairsUpdater extends Stack {
  constructor(scope: App, id: string, props?: EthDynamoProps) {
    super(scope, id, props);
    const { catalogDdb, chainId } = props!;

    const ddbCatalog = dynamodb.Table.fromTableName(this, 'DynamodbCatalog', catalogDdb);

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const tradesStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}TradesStream`,
      `arn:aws:kinesis:${this.region}:${this.account}:stream/${chainId}-trades-stream`
    );

    const tokensStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}TokensStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-new-tokens`
    );

    // Pair Updater
    const pairsUpdaterFunction = new NodejsFunction(this, 'PairsUpdaterHandler', {
      description: `Updates the ${chainId} pair information`,
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-dynamodb-pair-info-updater`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        CHAIN_ID: chainId,
        TOKENS_STREAM: tokensStream.streamArn,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
      },
      bundling: {
        minify: true,
      },
      entry: path.join(__dirname, `/../src/app-dynamodb-pairs-updaters/eth-dynamodb-pair-info-updater/index.ts`),
    });

    ddbCatalog.grantFullAccess(pairsUpdaterFunction);
    tradesStream.grantRead(pairsUpdaterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(tradesStream, {
      batchSize: 50,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    pairsUpdaterFunction.addEventSource(logsEventSource);

    // Pair Creator
    const pairCreatorFunction = new NodejsFunction(this, 'PairsCreatorHandler', {
      description: `Creates the ${chainId} pair information`,
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-dynamodb-pair-info-creator`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        FULL_NODE: `https://bsc-dataseed.binance.org/`,
        CHAIN_ID: chainId,
        TOKENS_STREAM: tokensStream.streamArn,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
      },
      bundling: {
        minify: true,
        externalModules: ['electron'],
      },
      entry: path.join(__dirname, `/../src/app-dynamodb-pairs-updaters/eth-dynamodb-pair-info-creator/index.ts`),
    });

    const pairEventsStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}PairsStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-new-pair-events`
    );

    const pairEventSource = new lambdaEventSources.KinesisEventSource(pairEventsStream, {
      batchSize: 200,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    ddbCatalog.grantFullAccess(pairCreatorFunction);
    pairEventsStream.grantRead(pairCreatorFunction);

    pairCreatorFunction.addEventSource(pairEventSource);
  }
}

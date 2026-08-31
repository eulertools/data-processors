import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Fn, Stack, StackProps } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from "aws-cdk-lib/aws-ssm";

interface EthDynamoProps extends StackProps {
  chainId: string;
  network: string;
  catalogDdb: string;
  hostedZone: string;
}

export class EthDynamodbTokenUpdater extends Stack {
  constructor(scope: App, id: string, props?: EthDynamoProps) {
    super(scope, id, props);
    const { catalogDdb, chainId, network, hostedZone } = props!;

    const ddbCatalog = dynamodb.Table.fromTableName(this, 'DynamodbCatalog', catalogDdb);

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const tokensStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}TokensStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-new-tokens`
    );

    // Token Creator Function
    const tokenCreatorFunction = new NodejsFunction(this, `${chainId}-token-creator`, {
      description: `Create and inserts new tokens in the ${chainId} Network`,
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-dynamodb-token-info-creator`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        FULL_NODE: `https://bsc-dataseed.binance.org/`,
        CHAIN_ID: chainId,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
      },
      bundling: {
        minify: true,
        externalModules: ['electron'],
      },
      entry: path.join(__dirname, `/../src/app-dynamodb-tokens-updater/eth-dynamodb-token-info-creator/index.ts`),
    });

    const tokensEventSource = new lambdaEventSources.KinesisEventSource(tokensStream, {
      batchSize: 200,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    ddbCatalog.grantFullAccess(tokenCreatorFunction);
    tokensStream.grantRead(tokenCreatorFunction);

    tokenCreatorFunction.addEventSource(tokensEventSource);

    // Token Updater Function
    const tradesStreamARN = Fn.importValue(`${chainId}-trades-kinesis-stream`)
    const tradesStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}PricesStream`,
      tradesStreamARN
    );

    const pricesUpdaterFunction = new NodejsFunction(this, 'PricesUpdaterHandler', {
      description: `Updates the ${chainId} token prices`,
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-dynamodb-token-price-updater`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        CHAIN_ID: chainId,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
      },
      entry: path.join(__dirname, `/../src/app-dynamodb-tokens-updater/eth-dynamodb-token-price-updater/index.ts`),
    });

    ddbCatalog.grantFullAccess(pricesUpdaterFunction);
    tradesStream.grantRead(pricesUpdaterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(tradesStream, {
      batchSize: 200,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    pricesUpdaterFunction.addEventSource(logsEventSource);

    const catalogArn = ssm.StringParameter.fromStringParameterName(
      this,
      "ssm-catalog-table-output",
      "/directory/table/catalog-table-arn"
    );

    const catalogTable = dynamodb.Table.fromTableArn(this,'catalog-table', catalogArn.stringValue);

    const opensearcCreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      "opensearchMasterUser",
      "opensearchMasterUser"
    );
    
    const OSUser = opensearcCreds.secretValueFromJson("username").toString();
    const OSPassword = opensearcCreds.secretValueFromJson("password").toString();

    const pricesNewCatalogUpdaterFunction = new NodejsFunction(this, 'PricesNewCatalogUpdaterHandler', {
      description: `Updates the ${chainId} token prices`,
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-dynamodb-token-price-updater-new`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        CHAIN_ID: network,
        CATALOG_DDB_TABLE: catalogTable.tableName,
        OS_DOMAIN: `catalogs.${hostedZone}`,
        OS_USER: OSUser,
        OS_PASSWORD: OSPassword,
        OS_INDEX: 'catalog_v1',
      },
      entry: path.join(__dirname, `/../src/app-dynamodb-tokens-updater/eth-dynamodb-token-price-updater-new-catalog/index.ts`),
    });

    catalogTable.grantFullAccess(pricesNewCatalogUpdaterFunction);
    tradesStream.grantRead(pricesNewCatalogUpdaterFunction);

    const logsNewEventSource = new lambdaEventSources.KinesisEventSource(tradesStream, {
      batchSize: 200,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.LATEST,
      enabled: true,
    });

    pricesNewCatalogUpdaterFunction.addEventSource(logsNewEventSource);
  }
}

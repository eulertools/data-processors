import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Stack, StackProps, Fn } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from "aws-cdk-lib/aws-ssm";

interface EthInserterProps extends StackProps {
  chainId: string;
  network: string;
  hostedZone: string;
  fullNode:string;
}

export class EthTokenTransfersUpdateSupply extends Stack {
  constructor(scope: App, id: string, props?: EthInserterProps) {
    super(scope, id, props);

    const { chainId, network, hostedZone, fullNode } = props!;

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const catalogArn = ssm.StringParameter.fromStringParameterName(
      this,
      "ssm-catalog-table-output",
      "/directory/table/catalog-table-arn"
    );

    const ddbCatalog = dynamodb.Table.fromTableArn(this,'catalog-table', catalogArn.stringValue);

    const apiCreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      'opensearchMasterUser',
      'opensearchMasterUser',
    );

    const OSUser = apiCreds.secretValueFromJson('username').toString();
    const OSPassword = apiCreds.secretValueFromJson('password').toString();

    const transfersStreamArn = Fn.importValue(`${chainId}-transfers-kinesis-stream`);
    const transferStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}LogsStream`,
      transfersStreamArn.toString()
    );

    const erc20UpdaterFunction = new NodejsFunction(this, 'UpdateSupplyTokenHandler', {
      description: 'Update supply of token transfers into the catalog',
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-update-supply-erc20-transfers`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        FULL_NODE: fullNode,
        CHAIN_ID: network,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
        OS_DOMAIN: `catalogs.${hostedZone}`,
        OS_INDEX: 'catalog_v1',
        OS_USER: OSUser,
        OS_PASSWORD: OSPassword
      },
      bundling: {
        minify: true,
        externalModules: ['electron']
      },
      entry: path.join(__dirname, `/../src/app-eth-token-transfers-update-supply/index.ts`),
    });

    ddbCatalog.grantReadWriteData(erc20UpdaterFunction);
    transferStream.grantRead(erc20UpdaterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(transferStream, {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    erc20UpdaterFunction.addEventSource(logsEventSource);
  }
}

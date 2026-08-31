import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Stack, StackProps, Fn } from 'aws-cdk-lib';

interface EthInserterProps extends StackProps {
  chainId: string;
}

export class EthTokenTransfersInserters extends Stack {
  constructor(scope: App, id: string, props?: EthInserterProps) {
    super(scope, id, props);

    const { chainId } = props!;

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseCredentials',
      `databases/${chainId}`
    );

    const transfersStreamArn = Fn.importValue(`${chainId}-transfers-kinesis-stream`);
    const transferStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}LogsStream`,
      transfersStreamArn.toString()
    );

    const erc20InserterFunction = new NodejsFunction(this, 'LogsInserterHandler', {
      description: 'Inserts the token transfers into the database',
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-inserter-erc20-transfers`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        DB_CREDS: dbcreds.secretValue.toString(),
      },
      bundling: {
        minify: true,
        externalModules: ['electron'],
        nodeModules: ['pg'],
      },
      entry: path.join(__dirname, `/../src/app-eth-token-transfers-inserter/index.ts`),
    });

    transferStream.grantRead(erc20InserterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(transferStream, {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    erc20InserterFunction.addEventSource(logsEventSource);
  }
}

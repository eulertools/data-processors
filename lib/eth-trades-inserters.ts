import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Stack, StackProps, Fn } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface EthInserterProps extends StackProps {
  chainId: string;
  catalogDdb: string;
  vpcId: string;
  servicesSG: string;
  resourcesSG: string;
}

export class EthTradesInserters extends Stack {
  constructor(scope: App, id: string, props?: EthInserterProps) {
    super(scope, id, props);

    const { servicesSG, vpcId, chainId } = props!;

    const targetVpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', { vpcId: vpcId });

    const servicesSecGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ServicesSG', servicesSG);

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseCredentials',
      `databases/${chainId}/trades`
    );

    const tradesStreamArn = Fn.importValue(`${chainId}-trades-kinesis-stream`);
    const tradesStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}TradesStream`,
      tradesStreamArn.toString()
    );

    const tradesInserterFunction = new NodejsFunction(this, 'TradesInserterHandler', {
      description: 'Inserts the trades transfers into the database',
      memorySize: 512,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-inserter-trades`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        DB_CREDS: dbcreds.secretValue.toString(),
        CHAIN_ID: chainId
      },
      vpc: targetVpc,
      vpcSubnets: targetVpc.selectSubnets({ onePerAz: true }),
      securityGroups: [servicesSecGroup],
      bundling: {
        minify: true,
        externalModules: ['electron'],
        nodeModules: ['pg'],
      },
      entry: path.join(__dirname, `/../src/app-eth-trades-inserter/index.ts`),
    });

    tradesStream.grantRead(tradesInserterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(tradesStream, {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
      bisectBatchOnError: true,
    });

    tradesInserterFunction.addEventSource(logsEventSource);
  }
}

import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { App, Duration, Fn, Stack, StackProps } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface EthNeo4jProps extends StackProps {
  chainId: string;
  catalogDdb: string;
}

export class EthNeo4jUpdater extends Stack {
  constructor(scope: App, id: string, props?: EthNeo4jProps) {
    super(scope, id, props);
    const { catalogDdb, chainId } = props!;

    const targetVpc = ec2.Vpc.fromLookup(this, "legacy-vpc", { vpcName: 'legacy' });

    const secGroupId = ssm.StringParameter.valueFromLookup(this, '/vpc-legacy/security-group/services');
    const servicesSecGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "ServicesSG",
      secGroupId
    );

    const ddbCatalog = dynamodb.Table.fromTableName(this, 'DynamodbCatalog', catalogDdb);

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseCredentials',
      `databases/neo4j`
    );

    const syncsStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}SyncsStream`,
      `arn:aws:kinesis:us-east-1:${this.account}:stream/${chainId}-sync-events`
    );

    const pairUpdaterFunction = new NodejsFunction(this, 'PricesUpdaterHandler', {
      description: `Updates the ${chainId} neo4j prices`,
      memorySize: 1024,
      timeout: Duration.seconds(15),
      handler: 'handler',
      functionName: `${chainId}-neo4j-updater`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        FULL_NODE: `https://bsc-dataseed.binance.org/`,
        DB_CREDS: dbcreds.secretValue.toString(),
        CHAIN_ID: chainId,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
        REDIS_URL: 'bsc-prices-cache.gvfdfg.0001.use1.cache.amazonaws.com',
      },
      vpc: targetVpc,
      vpcSubnets: targetVpc.selectSubnets({ onePerAz: true }),
      securityGroups: [servicesSecGroup],
      bundling: {
        minify: true,
        externalModules: ['electron'],
      },
      entry: path.join(__dirname, `/../src/app-eth-neo4j-updater/index.ts`),
    });

    ddbCatalog.grantReadWriteData(pairUpdaterFunction);
    syncsStream.grantRead(pairUpdaterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(syncsStream, {
      batchSize: 50,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.LATEST,
      enabled: true,
      bisectBatchOnError: true,
    });

    pairUpdaterFunction.addEventSource(logsEventSource);
  }
}

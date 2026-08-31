import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {App, Duration, Stack, StackProps, CfnOutput} from 'aws-cdk-lib';
import * as path from 'path';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

interface EthTradesProps extends StackProps {
  chainId: string;
  catalogDdb: string;
  vpcId: string;
  servicesSG: string;
  resourcesSG: string;
}

export class ETHPricesStream extends Stack {
  constructor(scope: App, id: string, props?: EthTradesProps) {
    super(scope, id, props);

    const { chainId, catalogDdb, vpcId, servicesSG, resourcesSG } = props!;

    const targetVpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', { vpcId: vpcId });

    const servicesSecGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ServicesSG', servicesSG);
    const resourcesSecGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'resourcesSG', resourcesSG);

    const ddbCatalog = dynamodb.Table.fromTableName(this, 'CatalogTable', catalogDdb)

    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseCredentials',
      `databases/${chainId}/trades`
    );


    // Define a group for telling Elasticache which subnets to put cache nodes in.
    const subnetGroup = new elasticache.CfnSubnetGroup(this, `${chainId}-subnet-group`, {
      description: `List of subnets used for redis cache ${chainId}`,
      subnetIds: targetVpc.privateSubnets.map(function (subnet) {
        return subnet.subnetId;
      }),
    });

    // The cluster resource itself.
    const cluster = new elasticache.CfnCacheCluster(this, `${chainId}-cache-cluster`, {
      clusterName: `${chainId}-prices-cache`,
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [resourcesSecGroup.securityGroupId],
    });

    const swapsStream = kinesis.Stream.fromStreamArn(
      this,
      `${chainId}SwapsStream`,
      `arn:aws:kinesis:${this.region}:${this.account}:stream/${chainId}-swaps`
    );

    const tradesStream = new kinesis.Stream(
      this,
      `${chainId}PriceUpdatesStream`,
      {streamName: `${chainId}-trades-stream`}
    );

    const pricesUpdaterFunction = new NodejsFunction(this, 'PricesUpdaterHandler', {
      description: `Calculates the ${chainId} swap prices`,
      memorySize: 1024,
      timeout: Duration.minutes(1),
      handler: 'handler',
      functionName: `${chainId}-trades-price-calculator`,
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        STREAM_NAME: tradesStream.streamName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        DSN_URL: sentryDSN.secretValue.toString(),
        DB_NAME: 'mainnet',
        FULL_NODE: `https://bsc-dataseed.binance.org/`,
        DB_CREDS: dbcreds.secretValue.toString(),
        CHAIN_ID: chainId,
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
        REDIS_URL: cluster.attrRedisEndpointAddress,
      },
      vpc: targetVpc,
      vpcSubnets: targetVpc.selectSubnets({ onePerAz: true }),
      securityGroups: [servicesSecGroup],
      bundling: {
        minify: true,
        externalModules: ['electron'],
        nodeModules: ['pg'],
      },
      entry: path.join(__dirname, `/../src/app-eth-trades-price-calculator/index.ts`),
    });

    ddbCatalog.grantFullAccess(pricesUpdaterFunction);
    swapsStream.grantRead(pricesUpdaterFunction);
    tradesStream.grantWrite(pricesUpdaterFunction);

    const logsEventSource = new lambdaEventSources.KinesisEventSource(swapsStream, {
      batchSize: 20,
      parallelizationFactor: 1,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      enabled: true,
    });

    pricesUpdaterFunction.addEventSource(logsEventSource);

    new CfnOutput(this, 'trades-kinesis-stream', {
      value: tradesStream.streamArn,
      description: 'Calculated Trades Kinesis Stream ARN',
      exportName: `${chainId}-trades-kinesis-stream`,
    });
  }
}

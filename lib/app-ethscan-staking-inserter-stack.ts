import { Duration, Stack, StackProps, Fn } from 'aws-cdk-lib';
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from 'constructs';
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

interface EthscanCollectorProps extends StackProps {
  chain_id: string;
  rpc: string;
  api_url: string;
  api_key: string;
}

export class AppEthscanStakingInserterStack extends Stack {
  constructor(scope: Construct, id: string, props?: EthscanCollectorProps) {
    super(scope, id, props);

    const {
      chain_id,
      rpc,
      api_url,
      api_key,
    } = props!;

    const dbcreds = secretsmanager.Secret.fromSecretNameV2(
      this,
      "DatabaseCredentials",
      `databases/${chain_id}`
    );

    const topic = new sns.Topic(this, 'Topic', 
      {
        topicName: `${chain_id}-ethscan-staking-insert`,
      }
    );
    
    const queue = new sqs.Queue(
      this,
      `${chain_id}EthScanStakingInsertQueue`,
      {
        queueName: `${chain_id}-ethscan-wallet-txs-events`,
        visibilityTimeout: Duration.seconds(300),
      }
    );

    topic.addSubscription(new subscriptions.SqsSubscription(queue));

    const stakingInsertFunction = new NodejsFunction(this, `${chain_id}EthScanStakingInsertFunction`, {
      description: 'Add the information of the price and type of tokens transfers',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'handler',
      functionName: `${chain_id}-ethscan-staking-transfer`,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../src/app-ethscan-staking-inserter/index.ts`),
      bundling: {
        minify: true,
        externalModules: ['electron'],
        nodeModules: ["pg"]
      },
      environment: {
        FULL_NODE: rpc,
        NETWORK_API: api_url,
        NETWORK_RPC: rpc,
        NETWORK_API_KEY: api_key,
        DB_CREDS: dbcreds.secretValue.toString(),
        DB_NAME: 'mainnet'
      }
    });

    const txsFnEventSource = new lambdaEventSources.SqsEventSource(queue,
      {
        batchSize: 1,
        enabled: true
      }
    );

    stakingInsertFunction.addEventSource(txsFnEventSource);
  }
}

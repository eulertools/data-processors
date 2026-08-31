import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class LambdaStack extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const lambdarole = new iam.Role(this, "lambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    lambdarole.addManagedPolicy({
      managedPolicyArn: "arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy",
    });
    lambdarole.addManagedPolicy({
      managedPolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    });

    const layerArn =
      "arn:aws:lambda:" +
      process.env.CDK_DEFAULT_REGION +
      ":580247275435:layer:LambdaInsightsExtension:16";
    const layer = lambda.LayerVersion.fromLayerVersionArn(this, `LayerFromArn`, layerArn);

    new NodejsFunction(this, "lambda-fn", {
      functionName: "processor-lambda-fn",
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../src/lambda-dashboard-insights/index.ts`),
      layers: [layer],
    });
  }
}

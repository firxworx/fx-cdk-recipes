import {
  Fn,
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  RemovalPolicy,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodeLambda,
  aws_logs as logs,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as path from 'path'
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha'
import * as apigwv2Integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha'

/**
 * Stack that deploys a HTTP API (API Gateway v2) with a lambda handler.
 *
 * This stack does not exist within the context of a VPC.
 */
export class FxHttpApiStack extends Stack {
  readonly httpApi: apigwv2.HttpApi
  readonly handler: nodeLambda.NodejsFunction
  readonly logGroup: logs.LogGroup

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.handler = new nodeLambda.NodejsFunction(this, 'BasicLambda', {
      // functionName: ...
      memorySize: 512,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'main',
      entry: path.join(__dirname, '/../../../src/lambdas/hello-world/index.ts'),
      timeout: Duration.seconds(30),
      environment: {},
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      // tracing: lambda.Tracing.ACTIVE,
    })

    // defining a log group w/ matching name to the one that AWS will auto-generate for the lambda
    // enables specification of properties including the DESTROY removalPolicy
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.handler.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      description: 'HTTP API',
    })

    // take note of the proxy resource option with `path: '/{proxy+}'` + method ANY
    this.httpApi.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration('GetHttpApiIntegration', this.handler),
    })

    new CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.url ?? this.httpApi.apiEndpoint,
    })
  }

  public get httpEndpoint(): string {
    return Fn.select(1, Fn.split('://', this.httpApi.apiEndpoint))
  }
}

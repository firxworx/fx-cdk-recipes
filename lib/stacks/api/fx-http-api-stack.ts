import {
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodeLambda,
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

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.handler = new nodeLambda.NodejsFunction(this, 'BasicLambda', {
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
    })

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      description: 'HTTP API',
    })

    this.httpApi.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration('GetHttpApiIntegration', this.handler),
    })

    new CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.url ?? this.httpApi.apiEndpoint,
    })
  }
}

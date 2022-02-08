#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { FxCdkStack } from '../lib/fx-cdk-stack'
import { FxHttpApiStack } from '../lib/stacks/api/fx-http-api-stack'

const app = new cdk.App()

// https://docs.aws.amazon.com/cdk/latest/guide/environments.html
const env = {
  account: app.node.tryGetContext('region') || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext('account') || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
}

// cdk deploy FxCdkStack

const fxCdkStack = new FxCdkStack(app, 'FxCdkStack', {
  env,
})

const httpApiStack = new FxHttpApiStack(app, 'FxHttpApiStack', {
  env,
})

console.log(httpApiStack.httpEndpoint)

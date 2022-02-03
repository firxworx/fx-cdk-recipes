import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import { FxVpc } from './constructs/fx-vpc'

export class FxCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const vpc = new FxVpc(this, 'VPC', {})

    // example resource
    // const queue = new sqs.Queue(this, 'FxCdkRecipesQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

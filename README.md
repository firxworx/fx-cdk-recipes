# fx-cdk-recipes

Recipes for AWS infra in aws-cdk + TypeScript.

Refer to the constructs in the `lib/` folder.

The constructs in this repo generally apply defaults that are suited for non-production development and proof-of-concept scenarios. They can serve as a reference and provide boilerplate/starter code for project-specific production-grade architecture.

The `cdk.json` file includes the configuration for CDK Toolkit.

## Useful commands

- `yarn build`   compile typescript to js
- `yarn watch`   watch for changes and compile
- `yarn test`    perform the jest unit tests
- `cdk deploy`   deploy this stack to your default AWS account/region
- `cdk diff`     compare deployed stack with current state
- `cdk synth`    emits the synthesized CloudFormation template

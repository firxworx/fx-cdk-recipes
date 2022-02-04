# fx-cdk-recipes

Recipes for AWS infrastructure in aws-cdk + TypeScript.

Refer to the constructs in the `lib/` folder.

The constructs in this repo generally apply defaults that are suited for non-production development and proof-of-concept scenarios. They can serve as a reference and provide boilerplate/starter code for project-specific production-grade architecture.

The `cdk.json` file includes the configuration for CDK Toolkit.

## Development

Install aws-cdk and aws-cli per AWS documentation.

Configure aws-cli with your credentials. A key outcome is that have `~/.aws/credentials` and `~/.aws/config` files populated with correct values to access your AWS account with sufficient permissions to create your required infrastructure.

Run `yarn` to install project dependencies.

Ensure that your global `cdk --version` matches the `package.json` version. You can upgrade the packages in this project by running: `yarn upgrade-interactive --latest`.

Remove or comment out the `cdk.context.json` entry in your `.gitignore` file. Commit this file when running aws-cdk with your own infrastructure.

## Notes

- Project dependencies include `esbuild` to support building TypeScript lambdas locally prior to upload.

## aws-cli

### Lambdas

Directly invoke a lambda with a payload and save the response:

```sh
aws lambda invoke --function-name <functionName> --payload '{}' response.json
```

Fancy:

```sh
aws lambda invoke --function-name <functionName> --cli-binary-format raw-in-base64-out --payload '{"command":"get"}' response.json response.json
```

## Useful commands

- `yarn build`   compile typescript to js
- `yarn watch`   watch for changes and compile
- `yarn test`    perform the jest unit tests

Specify the `--profile <PROFILE_NAME>` flag if you have configured multiple AWS profiles.

- `cdk deploy`   deploy this stack to your default AWS account/region
- `cdk diff`     compare deployed stack with current state
- `cdk synth`    emits the synthesized CloudFormation template

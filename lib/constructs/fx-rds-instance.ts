import { RemovalPolicy, Duration } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
  Stack,
  aws_rds as rds,
  aws_ec2 as ec2,
  aws_secretsmanager as secretsManager,
  aws_ssm as ssm,
} from 'aws-cdk-lib'

export interface FxRdsInstanceProps {
  vpc: ec2.Vpc
  vpcSubnets?: ec2.SubnetSelection
  securityGroups?: Array<ec2.ISecurityGroup>
  iamAuthentication?: boolean
  secret?: secretsManager.ISecret
  allocatedStorage?: number
  databaseName?: string
  instanceIdentifier?: string
  instanceType?: ec2.InstanceType
  storageType?: rds.StorageType
  version?: rds.PostgresEngineVersion
  multiAz?: boolean
  removalPolicy?: RemovalPolicy
  deletionProtection?: boolean
  deleteAutomatedBackups?: boolean
  backupRetention?: Duration

  /** flag to provision an RDS proxy (migigates risk of maxing out connection pools w/ lambdas) - default `false` */
  includeProxy?: boolean
  /** flag to set logging defaults for cloudwatch - default `false` */
  includeLogging?: boolean
}

/**
 * Construct to create a RDS Postgres instance + generate credentials with Secrets Manager.
 *
 * The defaults set by this construct are lightweight and suitable for **non-production** stacks
 * for dev + PoC purposes. It will provision a T4G.micro instance with 5GB storage allocation and
 * removal/deletion policies that do not keep anything around if the stack is destroyed.
 *
 * The RDS instance is not encrypted.
 *
 * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html
 */
export class FxRdsInstance extends Construct {
  readonly instance: rds.DatabaseInstance
  readonly proxy: rds.DatabaseProxy | undefined

  readonly secret: secretsManager.ISecret

  readonly ssm: {
    secretArn: ssm.StringParameter
  }

  constructor(scope: Construct, id: string, props: FxRdsInstanceProps) {
    super(scope, id)

    const secretName = `${Stack.of(this).stackName}/${id}/rds`

    this.secret =
      props.secret ??
      new secretsManager.Secret(this, 'Secret', {
        secretName,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'postgres',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
        removalPolicy: RemovalPolicy.DESTROY,
      })

    this.ssm.secretArn = new ssm.StringParameter(this, 'SecretArn', {
      parameterName: `${secretName}Arn`,
      stringValue: this.secret.secretArn,
    })

    this.instance = new rds.DatabaseInstance(this, 'Postgres', {
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      databaseName: props.databaseName,
      instanceIdentifier: props.instanceIdentifier,
      port: 5432,
      multiAz: props.multiAz ?? false,
      instanceType: props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      storageType: props.storageType ?? rds.StorageType.GP2,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: props.version ?? rds.PostgresEngineVersion.VER_13_5,
      }),
      credentials: {
        username: this.secret.secretValueFromJson('username').toString(),
        password: this.secret.secretValueFromJson('password'),
      },
      allocatedStorage: 5,
      autoMinorVersionUpgrade: true,
      iamAuthentication: props.iamAuthentication ?? false,
      removalPolicy: props.removalPolicy ?? RemovalPolicy.DESTROY,
      deletionProtection: props.deletionProtection ?? false,
      deleteAutomatedBackups: props.deleteAutomatedBackups ?? true,
      backupRetention: props.backupRetention ?? Duration.days(1),

      // cloudwatchLogsExports: ['postgresql'],
      // cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      // storageEncrypted: true,
      // storageEncryptionKey: Alias.fromAliasName(this, 'key-alias-interface', 'alias/' + 'kms-alias-name'),
      // enablePerformanceInsights: true,
      // performanceInsightRentention,
      // performanceInsightEncryptionKey,
    })

    if (props.includeProxy) {
      this.proxy = this.instance.addProxy('Proxy', {
        vpc: props.vpc,
        vpcSubnets:
          props.vpcSubnets ??
          props.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          }),
        secrets: [this.instance.secret as secretsManager.ISecret],
        securityGroups: props.securityGroups,
        iamAuth: props.iamAuthentication ?? false,
        debugLogging: props.includeLogging ?? false,
        maxConnectionsPercent: 50,
        borrowTimeout: Duration.seconds(30),
        requireTLS: true,
      })
    }
  }
}

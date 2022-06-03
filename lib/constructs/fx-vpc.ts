import { Construct } from 'constructs'
import { CfnOutput, aws_ec2 as ec2 } from 'aws-cdk-lib'

// import EipNatProvider from '../providers/eip-nat-provider' - may be deprecated if nat gateways support eipAllocationIds now

/**
 * `FxVpc` props.
 *
 * Set optional `nat.type` as 'instance' to provision a self-managed low-cost alternative to
 * an AWS-managed NAT Gateway (for non-production purposes where cost is a concern).
 *
 * Set `nat.eipAllocationIds` with ID's of existing EIP's in your AWS Environment to provision the VPC
 * with NAT Gateway(s) configured to use them (e.g. for IP whitelist + firewall use-cases).
 *
 * If using pre-allocated EIP's you may wish to create them outside of the stack that uses this VPC construct
 * so that the IP reservations will not be lost when the stack is destroyed.
 *
 * Set `includeBastion` to `true` (default: `false`) to provision a lightweight linux bastion instance.
 */
export interface FxVpcProps {
  cidr?: string
  maxAzs?: number
  nat?: {
    type?: 'instance' | 'gateway'
    count?: number

    /** assign certain EIP's to the NAT gateway (e.g. for IP whitelist + firewall use-cases) - only supports NAT Gateways */
    eipAllocationIds?: string[]
  }
  subnets?: {
    activeCount?: number
    totalCount?: number
  }
  includeBastion?: boolean
}

export type FxVpcBastion = Readonly<{
  instance: ec2.BastionHostLinux
  securityGroup: ec2.SecurityGroup
}>

/**
 * Construct to create a VPC with default 2x AZ's, 3x subnets (public/private/isolated), and DNS enabled.
 * An optional linux bastion with a low-spec configuration can be added via the boolean `includeBastion` prop.
 *
 * The construct supports various NAT Gateway/Instance options:
 * - provide EIP allocation ID's (only NAT Gateways are supported) to assign specific IP addresses
 * - optionally provision a NAT Instance vs. NAT Gateway to save on costs (dev/test environments only)
 *
 * All defaults set by this construct should be reviewed and understood before deploying them for production use-cases.
 *
 * While NAT Instances offer significant cost savings vs. NAT Gateways, there are several caveats to this
 * configuration re instance lifecycle & maintanence (they must be self-managed), and the fact that AWS has not updated
 * the AMI for NAT instances in years. A related option is to roll your own NAT instance with your own configuration
 * and/or build your own more current NAT Instance AMI - an option that can support the new t4g instances (link below).
 *
 * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html - db instance + storage types
 * @see https://jrklein.com/2019/04/27/aws-nat-instances-using-arm-a1-instance-type/ - roll your own NAT instance
 */
export class FxVpc extends Construct {
  readonly vpc: ec2.Vpc

  readonly bastion: FxVpcBastion | undefined

  constructor(scope: Construct, id: string, props: FxVpcProps) {
    super(scope, id)

    const subnetConfiguration = [
      ec2.SubnetType.PUBLIC,
      ec2.SubnetType.PRIVATE_WITH_NAT,
      ec2.SubnetType.PRIVATE_ISOLATED,
    ].flatMap((subnetConfig) =>
      this.createSubnetConfigurations(subnetConfig, props.subnets?.activeCount, props.subnets?.totalCount),
    )

    this.vpc = new ec2.Vpc(this, 'VPC', {
      cidr: props.cidr ?? '10.0.0.0/16',
      maxAzs: props.maxAzs ?? 2,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration,
      natGateways: props.nat?.count ?? 1,
      natGatewayProvider:
        (props.nat?.type ?? 'gateway') === 'gateway'
          ? ec2.NatProvider.gateway({ eipAllocationIds: props.nat?.eipAllocationIds })
          : ec2.NatProvider.instance({
              instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.NANO),
            }),
      // the need for a custom NAT provider may be eliminated if ec2.NatProvider.gateway now supports eipAllocationIds --
      // @todo - confirm the aws solution for nat gateway eip's actually works as expected (https://docs.aws.amazon.com/cdk/api/v2//docs/aws-cdk-lib.aws_ec2.NatGatewayProps.html)
      // ...(props.natGatewayEipAllocationIds
      //   ? { natGatewayProvider: new EipNatProvider(this, props.natGatewayEipAllocationIds) }
      //   : {}),
    })

    if (props.includeBastion) {
      this.bastion = this.createBastion()
    }
  }

  /**
   * Return an array of `ec2.SubnetConfiguration` objects for a given `subnetType` with the `reserved` property
   * of items determined by the `activeCount` vs. `totalCount`.
   *
   * @param subnetType type of subnet
   * @param activeCount number of active subnets for this configuration
   * @param totalCount number of total (active + reserved) subnets for this configuration
   * @param cidrMask cidr mask for this subnet (defaults to `24`)
   * @returns subnet configuration options
   */
  private createSubnetConfigurations(
    subnetType: ec2.SubnetType,
    activeCount: number = 1,
    totalCount: number = 4,
    cidrMask: number = 24,
  ): ec2.SubnetConfiguration[] {
    if (activeCount > totalCount) {
      throw new Error(`FxVpc subnets activeCount cannot exceed totalCount`)
    }

    return Array(totalCount)
      .fill(undefined)
      .map((_, index) => {
        return {
          name: `${subnetType}${index === 0 ? '' : ` ${index + 1}`}`,
          cidrMask,
          subnetType,
          reserved: index + 1 > activeCount,
        }
      })
  }

  /**
   * Provision a lightweight bastion instance in a public subnet that allows outbound connections.
   *
   * Resources will require appropriate IAM Roles/Policies to accept connections from the bastion.
   *
   * Using `latestAmazonLinux()` will replace the image when a new one becomes available: this option is therefore
   * unsuitable for use-cases that require data (e.g. packages, keys, etc) to be persisted on the bastion instance.
   *
   * @returns object containing the bastion + security group
   */
  private createBastion(): FxVpcBastion {
    const securityGroup = new ec2.SecurityGroup(this, 'BastionSG', {
      vpc: this.vpc,
      allowAllOutbound: true,
    })

    return {
      instance: new ec2.BastionHostLinux(this, 'Bastion', {
        // instanceName: getResourceName(...),
        vpc: this.vpc,
        securityGroup,
        subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.NANO),
        machineImage: ec2.MachineImage.latestAmazonLinux({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      }),
      securityGroup,
    }
  }

  private createStackOutputs() {
    if (this.bastion) {
      new CfnOutput(this, 'BastionInstanceId', {
        value: this.bastion.instance.instanceId,
      })
      new CfnOutput(this, 'BastionInstancePublicDnsName', {
        value: this.bastion.instance.instancePublicDnsName,
      })
    }
  }
}

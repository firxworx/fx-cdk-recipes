import { Construct } from 'constructs'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'
import EipNatProvider from '../providers/eip-nat-provider'

/**
 * `FxVpc` props.
 *
 * Set optional `natProvider` to `ec2.NatProvider.instance()` for a low-cost alternative to
 * a full-on NAT Gateway (`ec2.NatProvider.gateway()`) for non-production purposes.
 *
 * Set `natGatewayEipAllocationIds` to an array of EIP Allocation ID's to provision the VPC
 * with NAT Gateway(s) configured to use the given EIP(s). This option supports use-cases related
 * to IP whitelists and firewall rules. If the given EIP's are created outside of the stack that
 * uses this construct they will not be lost/de-provisioned when the stack is destroyed. This
 * functionality is supported via a custom `NatProvider`. If this prop is set, it set will
 * override the `natProvider` prop.
 *
 * Set `includeBastion` to `true` (default: `false`) to provision a lightweight
 */
export interface FxVpcProps {
  cidr?: string
  maxAzs?: number
  natGateways?: number
  natGatewayEipAllocationIds?: string[]
  natProvider?: ec2.NatProvider
  includeBastion?: boolean
}

/**
 * Construct to create a VPC with default 2x AZ's, 3x subnets, various NAT Gateway features, and an optional
 * linux bastion.
 *
 * The defaults set by this construct should be reviewed before they are considered for production purposes.
 *
 * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html
 */
export class FxVpc extends Construct {
  readonly vpc: ec2.Vpc

  readonly bastion:
    | Readonly<{
        instance: ec2.BastionHostLinux
        securityGroup: ec2.SecurityGroup
      }>
    | undefined

  constructor(scope: Construct, id: string, props: FxVpcProps) {
    super(scope, id)

    this.vpc = new ec2.Vpc(this, 'VPC', {
      cidr: '10.0.0.0/16',
      maxAzs: props.maxAzs ?? 2,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration: [
        {
          name: 'Public',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'Private',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        {
          name: 'Tertiary',
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          reserved: true,
        },
      ],
      natGateways: props.natGateways ?? 1,
      natGatewaySubnets: {
        subnetGroupName: 'Public',
      },
      natGatewayProvider: props.natProvider ?? ec2.NatProvider.gateway(),
      ...(props.natGatewayEipAllocationIds
        ? { natGatewayProvider: new EipNatProvider(this, props.natGatewayEipAllocationIds) }
        : {}),
    })

    if (props.includeBastion) {
      const securityGroup = new ec2.SecurityGroup(this, 'BastionSG', {
        vpc: this.vpc,
        allowAllOutbound: true,
      })

      this.bastion = {
        instance: new ec2.BastionHostLinux(this, 'Bastion', {
          // instanceName: getResourceName(...),
          vpc: this.vpc,
          securityGroup,
          subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
          machineImage: ec2.MachineImage.latestAmazonLinux({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
        }),
        securityGroup,
      }
    }
  }
}

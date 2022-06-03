import { Construct } from 'constructs'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'

/**
 * Custom `ec2.NatProvider` for use by `ec2.Vpc()` constructs to associate NAT Gateways with
 * pre-existing EIP's in support of use-cases related to firewall and whitelist configuration.
 *
 * This custom provider works around an issue where the `ec2.Vpc()` construct only supports creating
 * NAT Gateways with new vs. existing EIP allocations. This presents a problem for enduring production
 * infrastructure especially if third-parties are specifically whitelisting specific EIP's.
 *
 * Destroying resources that reference a pre-existing EIP allocation will result in the EIP becoming
 * dissociated from any resource: the EIP itself will remain allocated in the AWS account.
 *
 * Usage:
 * When defining a VPC, set the `natGatewayProvider` property value as follows, passing an
 * array of EIP allocation ID's:
 *
 * `new EipNatProvider(this, ["eipalloc-0123...0", "eipalloc-0123...1"])`
 *
 * Thank-you to @TikiTDO on GitHub for the basis of this code in a comment re the GitHub issue linked below.
 *
 * @see https://github.com/aws/aws-cdk/issues/4705#issuecomment-819617766
 */

export default class EipNatProvider extends ec2.NatProvider {
  private gateways: Array<[string, string]> = []

  constructor(private construct: Construct, private allocationIds: string[]) {
    super()
  }

  // this function is called by the VPC to configure the NAT gateways vs. the provided options
  configureNat(options: ec2.ConfigureNatOptions): void {
    // create the NAT gateways in public subnets, applying the given EIP's as available
    options.natSubnets.forEach((subnet, index) => {
      const gateway = new ec2.CfnNatGateway(this.construct, `NATGW${index}`, {
        allocationId:
          this.allocationIds[index] ??
          new ec2.CfnEIP(this.construct, `EIP${index}`, {
            domain: 'vpc',
          }).attrAllocationId,
        subnetId: subnet.subnetId,
      })

      this.gateways.push([subnet.availabilityZone, gateway.ref])
    })

    // apply configuration + route to each private subnet
    options.privateSubnets.forEach((privateSubnet) => {
      this.configureSubnet(privateSubnet)
    })
  }

  // ensure private subnets use the NAT gateway within their AZ
  configureSubnet(subnet: ec2.PrivateSubnet): void {
    const subnetAz = subnet.availabilityZone
    const [, gatewayRef] = this.gateways.find(([gatewayAz]) => subnetAz === gatewayAz) ?? []
    if (gatewayRef) {
      subnet.addRoute('DefaultRoute', {
        enablesInternetConnectivity: true,
        routerId: gatewayRef,
        routerType: ec2.RouterType.NAT_GATEWAY,
      })
    }
  }

  // return gateways created by this provider
  public get configuredGateways(): ec2.GatewayConfig[] {
    return this.gateways.map(([gatewayAz, gatewayId]) => ({
      az: gatewayAz,
      gatewayId,
    }))
  }
}

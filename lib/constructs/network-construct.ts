import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkConstructProps {
  /**
   * The maximum number of availability zones to use
   * @default 2
   */
  readonly maxAzs?: number;
  
  /**
   * The number of NAT gateways to create
   * @default 1
   */
  readonly natGateways?: number;
}

/**
 * Network construct that creates a VPC with public, private, and database subnets
 */
export class NetworkConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly databaseSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: NetworkConstructProps = {}) {
    super(scope, id);

    const maxAzs = props.maxAzs ?? 2;
    const natGateways = props.natGateways ?? 1;

    // Create VPC with 3-tier architecture
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: maxAzs,
      natGateways: natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Store subnet references
    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;
    this.databaseSubnets = this.vpc.isolatedSubnets;

    // Add tags for easier identification
    cdk.Tags.of(this.vpc).add('Component', 'Network');
  }
}

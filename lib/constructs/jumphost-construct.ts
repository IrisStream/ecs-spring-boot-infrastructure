import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface JumphostConstructProps {
  /**
   * The VPC to deploy the jumphost in
   */
  readonly vpc: ec2.IVpc;
  
  /**
   * The instance type for the jumphost
   * @default t3.micro
   */
  readonly instanceType?: ec2.InstanceType;
  
  /**
   * The key pair name for SSH access
   * @default 'springboot-jumphost-key'
   */
  readonly keyPairName?: string;
  
  /**
   * Whether to allow SSH access from anywhere
   * @default true
   */
  readonly allowSshFromAnywhere?: boolean;
}

/**
 * Jumphost construct that creates an EC2 instance for troubleshooting and testing
 */
export class JumphostConstruct extends Construct {
  public readonly instance: ec2.Instance;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly keyPair: ec2.KeyPair;

  constructor(scope: Construct, id: string, props: JumphostConstructProps) {
    super(scope, id);

    const instanceType = props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);
    const keyPairName = props.keyPairName ?? 'springboot-jumphost-key';
    const allowSshFromAnywhere = props.allowSshFromAnywhere ?? true;

    // Create Key Pair for EC2 jumphost
    this.keyPair = new ec2.KeyPair(this, 'KeyPair', {
      keyPairName: keyPairName,
      type: ec2.KeyPairType.RSA,
      format: ec2.KeyPairFormat.PEM,
    });

    // Create security group for jumphost
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for EC2 jumphost',
      allowAllOutbound: true
    });

    // Allow SSH access
    if (allowSshFromAnywhere) {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'Allow SSH access from anywhere'
      );
    }

    // Create IAM role for jumphost
    const jumphostRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for jumphost instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
      ]
    });

    // Create user data script
    const userData = ec2.UserData.forLinux();
    this.setupUserData(userData);

    // Create EC2 jumphost instance
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      instanceType: instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      keyPair: this.keyPair,
      securityGroup: this.securityGroup,
      userData: userData,
      role: jumphostRole,
      userDataCausesReplacement: true,
    });

    // Add tags
    cdk.Tags.of(this.instance).add('Component', 'Jumphost');
    cdk.Tags.of(this.keyPair).add('Component', 'Jumphost');
  }

  /**
   * Setup user data script for the jumphost
   */
  private setupUserData(userData: ec2.UserData): void {
    userData.addCommands(
      // Update system
      'dnf update -y',
      
      // Install essential tools
      'dnf install -y postgresql15 docker git htop curl wget jq',
      
      // Configure Docker
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      
      // Install Docker Compose
      'curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
      'chmod +x /usr/local/bin/docker-compose',
      
      // Install AWS CLI v2 (if not already installed)
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      'unzip awscliv2.zip',
      './aws/install --update',
      'rm -rf awscliv2.zip aws/',
      
      // Install Session Manager plugin
      'dnf install -y https://s3.amazonaws.com/session-manager-downloads/plugin/latest/linux_64bit/session-manager-plugin.rpm',
      
      // Create useful scripts
      'mkdir -p /home/ec2-user/scripts',
      
      // Create database connection script
      'cat > /home/ec2-user/scripts/connect-db.sh << EOF',
      '#!/bin/bash',
      'echo "Usage: ./connect-db.sh <database-endpoint> <username> <database-name>"',
      'echo "Example: ./connect-db.sh mydb.xyz.rds.amazonaws.com springboot springbootdb"',
      'if [ $# -eq 3 ]; then',
      '  psql -h $1 -U $2 -d $3',
      'fi',
      'EOF',
      'chmod +x /home/ec2-user/scripts/connect-db.sh',
      
      // Create log monitoring script
      'cat > /home/ec2-user/scripts/watch-logs.sh << EOF',
      '#!/bin/bash',
      'echo "Watching ECS logs..."',
      'aws logs tail /ecs/spring-boot-app --follow',
      'EOF',
      'chmod +x /home/ec2-user/scripts/watch-logs.sh',
      
      // Set ownership
      'chown -R ec2-user:ec2-user /home/ec2-user/scripts',
      
      // Log completion
      'echo "Jumphost setup completed at $(date)" > /var/log/jumphost-setup.log',
      'echo "Available scripts in /home/ec2-user/scripts:" >> /var/log/jumphost-setup.log',
      'ls -la /home/ec2-user/scripts/ >> /var/log/jumphost-setup.log'
    );
  }

  /**
   * Get the public IP address of the jumphost
   */
  public get publicIp(): string {
    return this.instance.instancePublicIp;
  }

  /**
   * Get the instance ID of the jumphost
   */
  public get instanceId(): string {
    return this.instance.instanceId;
  }
}

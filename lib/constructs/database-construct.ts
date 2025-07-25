import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseConstructProps {
  /**
   * The VPC to deploy the database in
   */
  readonly vpc: ec2.IVpc;
  
  /**
   * The database name
   * @default 'springbootdb'
   */
  readonly databaseName?: string;
  
  /**
   * The database username
   * @default 'springboot'
   */
  readonly username?: string;
  
  /**
   * The instance type for the database
   * @default t3.micro
   */
  readonly instanceType?: ec2.InstanceType;
  
  /**
   * The allocated storage in GB
   * @default 20
   */
  readonly allocatedStorage?: number;
  
  /**
   * The maximum allocated storage in GB
   * @default 100
   */
  readonly maxAllocatedStorage?: number;
  
  /**
   * Whether to enable deletion protection
   * @default false
   */
  readonly deletionProtection?: boolean;
}

/**
 * Database construct that creates an RDS PostgreSQL instance with proper security
 */
export class DatabaseConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly secret: secretsmanager.Secret;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly endpoint: string;
  public readonly port: number;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const databaseName = props.databaseName ?? 'springbootdb';
    const username = props.username ?? 'springboot';
    const instanceType = props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);
    const allocatedStorage = props.allocatedStorage ?? 20;
    const maxAllocatedStorage = props.maxAllocatedStorage ?? 100;
    const deletionProtection = props.deletionProtection ?? false;

    // Create database credentials secret
    this.secret = new secretsmanager.Secret(this, 'Secret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: username }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        passwordLength: 16,
      },
      description: 'Database credentials for Spring Boot application'
    });

    // Create security group for database
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: false
    });

    // Create RDS Database Instance
    this.instance = new rds.DatabaseInstance(this, 'Instance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: instanceType,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: databaseName,
      allocatedStorage: allocatedStorage,
      maxAllocatedStorage: maxAllocatedStorage,
      deleteAutomatedBackups: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: deletionProtection,
      removalPolicy: deletionProtection ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      securityGroups: [this.securityGroup],
      monitoringInterval: cdk.Duration.minutes(1), // Enable enhanced monitoring
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
    });

    // Store endpoint and port for easy access
    this.endpoint = this.instance.instanceEndpoint.hostname;
    this.port = this.instance.instanceEndpoint.port;

    // Add tags
    cdk.Tags.of(this.instance).add('Component', 'Database');
    cdk.Tags.of(this.secret).add('Component', 'Database');
  }

  /**
   * Allow connections from a security group to this database
   */
  public allowConnectionsFrom(source: ec2.IConnectable, description?: string): void {
    this.securityGroup.addIngressRule(
      source instanceof ec2.SecurityGroup ? source : source.connections.securityGroups[0],
      ec2.Port.tcp(this.port),
      description ?? 'Allow database connection'
    );
  }
}

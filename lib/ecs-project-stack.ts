import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import {
  NetworkConstruct,
  DnsConstruct,
  DatabaseConstruct,
  JumphostConstruct,
  ApplicationConstruct
} from './constructs';

export interface EcsProjectStackProps extends cdk.StackProps {
  /**
   * The domain name for the application
   * @default 'oazis.site'
   */
  readonly domainName?: string;
  
  /**
   * The subdomain for the application
   * @default 'spring'
   */
  readonly subdomainName?: string;
}

export class EcsProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsProjectStackProps = {}) {
    super(scope, id, props);

    const domainName = props.domainName ?? 'oazis.site';
    const subdomainName = props.subdomainName ?? 'spring';

    // Create Network Infrastructure
    const network = new NetworkConstruct(this, 'Network', {
      maxAzs: 2,
      natGateways: 1
    });

    // Create DNS and SSL Certificate
    const dns = new DnsConstruct(this, 'Dns', {
      domainName: domainName,
      subdomainName: subdomainName
    });

    // Create Database
    const database = new DatabaseConstruct(this, 'Database', {
      vpc: network.vpc,
      databaseName: 'springbootdb',
      username: 'springboot',
      deletionProtection: false // Set to true for production
    });

    // Create Jumphost
    const jumphost = new JumphostConstruct(this, 'Jumphost', {
      vpc: network.vpc,
      keyPairName: 'springboot-jumphost-key'
    });

    // Allow jumphost to connect to database
    database.allowConnectionsFrom(jumphost.securityGroup, 'Allow jumphost to connect to database');

    // Create Application (ECS Service)
    const application = new ApplicationConstruct(this, 'Application', {
      vpc: network.vpc,
      certificate: dns.certificate,
      databaseEndpoint: database.endpoint,
      databasePort: database.port,
      databaseSecret: database.secret,
      databaseName: 'springbootdb',
      desiredCount: 2,
      minCapacity: 1,
      maxCapacity: 10
    });

    // Allow ECS service to connect to database
    database.allowConnectionsFrom(application.securityGroup, 'Allow ECS service to connect to database');

    // Create Route53 A record pointing to the load balancer
    dns.createARecord(
      route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(application.loadBalancer)
      )
    );

    // Stack Outputs
    this.createOutputs(dns, database, jumphost, application);
  }

  /**
   * Create CloudFormation outputs
   */
  private createOutputs(
    dns: DnsConstruct,
    database: DatabaseConstruct,
    jumphost: JumphostConstruct,
    application: ApplicationConstruct
  ): void {
    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `https://${dns.fullDomainName}`,
      description: 'HTTPS URL of the Spring Boot application'
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: application.loadBalancerDnsName,
      description: 'DNS name of the load balancer'
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: application.cluster.clusterName,
      description: 'Name of the ECS cluster'
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: application.repository.repositoryUri,
      description: 'ECR Repository URI'
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.endpoint,
      description: 'RDS Database endpoint'
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: database.secret.secretArn,
      description: 'Database credentials secret ARN'
    });

    new cdk.CfnOutput(this, 'JumphostInstanceId', {
      value: jumphost.instanceId,
      description: 'EC2 Jumphost instance ID'
    });

    new cdk.CfnOutput(this, 'JumphostPublicIP', {
      value: jumphost.publicIp,
      description: 'EC2 Jumphost public IP address'
    });

    new cdk.CfnOutput(this, 'SSHKeyPairName', {
      value: jumphost.keyPair.keyPairName,
      description: 'SSH Key Pair name for jumphost access'
    });
  }
}

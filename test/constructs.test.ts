import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkConstruct, DatabaseConstruct } from '../lib/constructs';

describe('CDK Constructs', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
  });

  describe('NetworkConstruct', () => {
    test('creates VPC with correct subnet configuration', () => {
      // Create network construct
      new NetworkConstruct(stack, 'TestNetwork', {
        maxAzs: 2,
        natGateways: 1
      });

      const template = Template.fromStack(stack);

      // Verify VPC creation
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });

      // Verify subnet creation (should have 6 subnets: 2 public, 2 private, 2 database)
      template.resourceCountIs('AWS::EC2::Subnet', 6);

      // Verify NAT Gateway creation
      template.resourceCountIs('AWS::EC2::NatGateway', 1);

      // Verify Internet Gateway creation
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    });

    test('allows customization of AZ count', () => {
      new NetworkConstruct(stack, 'TestNetwork', {
        maxAzs: 3,
        natGateways: 2
      });

      const template = Template.fromStack(stack);

      // With 3 AZs, should have 9 subnets (3 of each type)
      template.resourceCountIs('AWS::EC2::Subnet', 9);
      
      // Should have 2 NAT gateways
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
    });
  });

  describe('DatabaseConstruct', () => {
    test('creates RDS instance with correct configuration', () => {
      // Create VPC first
      const network = new NetworkConstruct(stack, 'TestNetwork');

      // Create database construct
      new DatabaseConstruct(stack, 'TestDatabase', {
        vpc: network.vpc,
        databaseName: 'testdb',
        username: 'testuser'
      });

      const template = Template.fromStack(stack);

      // Verify RDS instance creation
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'postgres',
        DBName: 'testdb',
        AllocatedStorage: '20',
        MaxAllocatedStorage: 100
      });

      // Verify security group creation
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for RDS database'
      });

      // Verify secret creation
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Description: 'Database credentials for Spring Boot application'
      });
    });

    test('supports deletion protection configuration', () => {
      const network = new NetworkConstruct(stack, 'TestNetwork');

      new DatabaseConstruct(stack, 'TestDatabase', {
        vpc: network.vpc,
        deletionProtection: true
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DeletionProtection: true
      });
    });
  });

  describe('Stack Integration', () => {
    test('constructs work together correctly', () => {
      const network = new NetworkConstruct(stack, 'Network');
      const database = new DatabaseConstruct(stack, 'Database', {
        vpc: network.vpc
      });

      // Verify that database can access VPC subnets
      expect(network.vpc).toBeDefined();
      expect(database.instance).toBeDefined();

      const template = Template.fromStack(stack);

      // Verify all components are created
      template.resourceCountIs('AWS::EC2::VPC', 1);
      template.resourceCountIs('AWS::RDS::DBInstance', 1);
      template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    });
  });
});

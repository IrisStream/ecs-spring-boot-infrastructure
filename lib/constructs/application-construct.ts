import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ApplicationConstructProps {
  /**
   * The VPC to deploy the application in
   */
  readonly vpc: ec2.IVpc;
  
  /**
   * The SSL certificate for HTTPS
   */
  readonly certificate: acm.ICertificate;
  
  /**
   * The database endpoint
   */
  readonly databaseEndpoint: string;
  
  /**
   * The database port
   */
  readonly databasePort: number;
  
  /**
   * The database secret containing credentials
   */
  readonly databaseSecret: secretsmanager.ISecret;
  
  /**
   * The database name
   */
  readonly databaseName: string;
  
  /**
   * The GitHub repository URL to build from
   * @default 'https://github.com/integrationninjas/springboot-example.git'
   */
  readonly githubRepo?: string;
  
  /**
   * The desired number of tasks
   * @default 2
   */
  readonly desiredCount?: number;
  
  /**
   * The CPU units for the task
   * @default 512
   */
  readonly cpu?: number;
  
  /**
   * The memory limit in MiB
   * @default 1024
   */
  readonly memoryLimitMiB?: number;
  
  /**
   * The minimum capacity for auto scaling
   * @default 1
   */
  readonly minCapacity?: number;
  
  /**
   * The maximum capacity for auto scaling
   * @default 10
   */
  readonly maxCapacity?: number;
}

/**
 * Application construct that creates the ECS service, ECR repository, and related resources
 */
export class ApplicationConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly repository: ecr.Repository;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ApplicationConstructProps) {
    super(scope, id);

    const githubRepo = props.githubRepo ?? 'https://github.com/integrationninjas/springboot-example.git';
    const desiredCount = props.desiredCount ?? 2;
    const cpu = props.cpu ?? 512;
    const memoryLimitMiB = props.memoryLimitMiB ?? 1024;
    const minCapacity = props.minCapacity ?? 1;
    const maxCapacity = props.maxCapacity ?? 10;

    // Create ECR Repository
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: 'spring-boot-app',
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY // Use RETAIN for production
    });

    // Create CloudWatch Log Group
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: '/ecs/spring-boot-app',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'spring-boot-cluster',
      containerInsights: true
    });

    // Build Docker image from GitHub repository
    const springBootImage = ecs.ContainerImage.fromAsset(
      path.join(__dirname, '..', '..', 'docker-build'),
      {
        buildArgs: {
          'GITHUB_REPO': githubRepo
        },
        platform: cdk.aws_ecr_assets.Platform.LINUX_AMD64
      }
    );

    // Create Fargate Service with Application Load Balancer
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster: this.cluster,
      serviceName: 'spring-boot-service',
      cpu: cpu,
      memoryLimitMiB: memoryLimitMiB,
      desiredCount: desiredCount,
      taskImageOptions: {
        image: springBootImage,
        containerPort: 8080,
        environment: {
          'SPRING_PROFILES_ACTIVE': 'prod',
          'SERVER_PORT': '8080',
          'DATABASE_HOST': props.databaseEndpoint,
          'DATABASE_PORT': props.databasePort.toString(),
          'DATABASE_NAME': props.databaseName
        },
        secrets: {
          'DATABASE_USERNAME': ecs.Secret.fromSecretsManager(props.databaseSecret, 'username'),
          'DATABASE_PASSWORD': ecs.Secret.fromSecretsManager(props.databaseSecret, 'password')
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'spring-boot',
          logGroup: this.logGroup
        })
      },
      publicLoadBalancer: true,
      listenerPort: 443,
      protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTPS,
      certificate: props.certificate,
      redirectHTTP: true,
      platformVersion: ecs.FargatePlatformVersion.LATEST
    });

    // Configure health check
    this.service.targetGroup.configureHealthCheck({
      path: '/', // Root endpoint since this app doesn't have actuator
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3
    });

    // Setup Auto Scaling
    this.setupAutoScaling(minCapacity, maxCapacity);

    // Add tags
    cdk.Tags.of(this.cluster).add('Component', 'Application');
    cdk.Tags.of(this.repository).add('Component', 'Application');
    cdk.Tags.of(this.logGroup).add('Component', 'Application');
  }

  /**
   * Setup auto scaling for the ECS service
   */
  private setupAutoScaling(minCapacity: number, maxCapacity: number): void {
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: minCapacity,
      maxCapacity: maxCapacity
    });

    // Scale based on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2)
    });

    // Scale based on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2)
    });
  }

  /**
   * Get the load balancer DNS name
   */
  public get loadBalancerDnsName(): string {
    return this.service.loadBalancer.loadBalancerDnsName;
  }

  /**
   * Get the load balancer for Route53 alias record
   */
  public get loadBalancer(): cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer {
    return this.service.loadBalancer;
  }

  /**
   * Get the security group for the ECS service
   */
  public get securityGroup(): ec2.ISecurityGroup {
    return this.service.service.connections.securityGroups[0];
  }
}

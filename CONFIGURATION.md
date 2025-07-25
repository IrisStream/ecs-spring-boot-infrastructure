# Environment Configuration Examples

This file contains examples of how to configure the CDK stack for different environments.

## Development Environment

```typescript
// In bin/ecs-project.ts
const devEnv = {
  account: '123456789012',
  region: 'us-east-1'
};

new EcsProjectStack(app, 'EcsProjectStack-Dev', {
  env: devEnv,
  // Override defaults for development
  desiredCount: 1,
  cpu: 256,
  memoryLimitMiB: 512,
  maxCapacity: 2
});
```

## Production Environment

```typescript
// In bin/ecs-project.ts
const prodEnv = {
  account: '123456789012',
  region: 'us-east-1'
};

new EcsProjectStack(app, 'EcsProjectStack-Prod', {
  env: prodEnv,
  // Production settings
  desiredCount: 3,
  cpu: 1024,
  memoryLimitMiB: 2048,
  maxCapacity: 20
});
```

## Multi-Environment Deployment

You can modify your stack to accept parameters:

```typescript
// lib/ecs-project-stack.ts
interface EcsProjectStackProps extends cdk.StackProps {
  desiredCount?: number;
  cpu?: number;
  memoryLimitMiB?: number;
  maxCapacity?: number;
  environment?: 'dev' | 'staging' | 'prod';
}

export class EcsProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsProjectStackProps) {
    super(scope, id, props);

    const desiredCount = props.desiredCount || 2;
    const cpu = props.cpu || 512;
    const memoryLimitMiB = props.memoryLimitMiB || 1024;
    const maxCapacity = props.maxCapacity || 10;
    
    // Use these variables in your resource definitions
    // ...
  }
}
```

## Container Image Management

### Using ECR

```typescript
// Update the image reference to use ECR
taskImageOptions: {
  image: ecs.ContainerImage.fromEcrRepository(
    ecr.Repository.fromRepositoryName(this, 'SpringBootRepo', 'spring-boot-app'),
    'latest'
  ),
  // ... other options
}
```

### Using Docker Hub

```typescript
taskImageOptions: {
  image: ecs.ContainerImage.fromRegistry('your-dockerhub-username/spring-boot-app:latest'),
  // ... other options
}
```

## Database Integration

### RDS PostgreSQL

```typescript
// Add to your stack
const database = new rds.DatabaseInstance(this, 'Database', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15
  }),
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
  vpc: vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
  },
  databaseName: 'springbootdb'
});

// Add environment variables to the task
environment: {
  'SPRING_PROFILES_ACTIVE': 'prod',
  'SERVER_PORT': '8080',
  'DATABASE_HOST': database.instanceEndpoint.hostname,
  'DATABASE_PORT': database.instanceEndpoint.port.toString(),
  'DATABASE_NAME': 'springbootdb'
}
```

## HTTPS Configuration

```typescript
// Import certificate
const certificate = acm.Certificate.fromCertificateArn(
  this, 
  'Certificate',
  'arn:aws:acm:region:account:certificate/certificate-id'
);

// Update the load balancer configuration
const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'SpringBootService', {
  // ... other props
  protocol: elbv2.ApplicationProtocol.HTTPS,
  certificate: certificate,
  redirectHTTP: true
});
```

## Secrets Management

```typescript
// Create secrets in AWS Secrets Manager
const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: 'postgres' }),
    generateStringKey: 'password',
    excludeCharacters: '"@/\\'
  }
});

// Reference in task definition
secrets: {
  'DATABASE_PASSWORD': ecs.Secret.fromSecretsManager(dbSecret, 'password')
}
```

## Monitoring and Alerting

```typescript
// CloudWatch Alarms
const cpuAlarm = new cloudwatch.Alarm(this, 'HighCPUAlarm', {
  metric: fargateService.service.metricCpuUtilization(),
  threshold: 80,
  evaluationPeriods: 2
});

// SNS Topic for notifications
const topic = new sns.Topic(this, 'AlertTopic');
cpuAlarm.addAlarmAction(new snsActions.SnsAction(topic));
```

## Cost Optimization

```typescript
// Use Fargate Spot
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  memoryLimitMiB: 1024,
  cpu: 512
});

const service = new ecs.FargateService(this, 'Service', {
  cluster: cluster,
  taskDefinition: taskDefinition,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 1
    }
  ]
});
```

## Blue/Green Deployments

```typescript
// Use CodeDeploy for blue/green deployments
const deploymentConfig = codedeploy.EcsDeploymentConfig.fromEcsDeploymentConfigName(
  this,
  'BlueGreenConfig',
  'CodeDeployDefault.ECSBlueGreen10PercentEvery5Minutes'
);

const application = new codedeploy.EcsApplication(this, 'CodeDeployApp');

new codedeploy.EcsDeploymentGroup(this, 'BlueGreenDG', {
  application: application,
  service: fargateService.service,
  deploymentConfig: deploymentConfig
});
```

# Spring Boot ECS Deployment Guide

This CDK project automatically builds and deploys a Java Spring Boot application from GitHub (https://github.com/integrationninjas/springboot-example) on AWS ECS with Fargate.

## Architecture

- **VPC**: Custom VPC with public and private subnets across 2 AZs
- **ECR Repository**: Automatically created for storing container images
- **ECS Cluster**: Fargate cluster for running containers
- **Application Load Balancer**: Internet-facing ALB for traffic distribution
- **Auto Scaling**: CPU and memory-based auto scaling (1-10 instances)
- **CloudWatch Logs**: Centralized logging for application monitoring
- **Docker Image Building**: Automatic image building from GitHub source

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Node.js and npm installed
3. AWS CDK CLI installed: `npm install -g aws-cdk`
4. Docker installed (required by CDK for building images)
5. AWS account with sufficient permissions for ECR, ECS, VPC, and IAM

## Deployment Steps

### 1. Automatic Build Process

The CDK stack automatically:
- Creates an ECR repository (`spring-boot-app`)
- Clones the Spring Boot source code from GitHub
- Builds the Docker image using Maven and OpenJDK 17
- Pushes the image to ECR
- Deploys the application to ECS Fargate

**No manual Docker commands needed!**

### 2. Deploy CDK Stack

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only in your AWS account/region)
cdk bootstrap

# Deploy the stack (this will build and push the Docker image automatically)
cdk deploy
```

The deployment process will:
1. Create all AWS resources (VPC, ECR, ECS, ALB, etc.)
2. Build the Spring Boot application Docker image
3. Push the image to the created ECR repository
4. Deploy the application to ECS Fargate

### 3. Monitor Deployment

During deployment, you'll see:
- ECR repository creation
- Docker image building progress
- ECS service deployment status
- Load balancer configuration

## Application Details

The deployed Spring Boot application:
- **Source**: https://github.com/integrationninjas/springboot-example
- **Endpoint**: Root path (`/`) returns JSON with contact information
- **Port**: 8080 (containerized)
- **Health Check**: HTTP GET to `/` (returns 200 OK)
- **Java Version**: OpenJDK 17
- **Framework**: Spring Boot

### API Response
```json
{
  "name": "Integration Ninjas",
  "email": "integrationninjas@gmail.com"
}
```

## Configuration Options

### Environment Variables
You can add environment variables in the `taskImageOptions`:
```typescript
environment: {
  'SPRING_PROFILES_ACTIVE': 'prod',
  'SERVER_PORT': '8080',
  'DATABASE_URL': 'your-database-url'
}
```

### Resource Sizing
Adjust CPU and memory based on your application needs:
```typescript
cpu: 512,        // 0.5 CPU units (256, 512, 1024, 2048, 4096)
memoryLimitMiB: 1024,  // 1 GB (512, 1024, 2048, 3072, 4096, etc.)
```

### Auto Scaling
Modify scaling parameters:
```typescript
scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,  // Scale when CPU > 70%
});
```

## Monitoring and Logging

- **CloudWatch Logs**: Application logs are available in `/ecs/spring-boot-app` log group
- **ECS Console**: Monitor service health and task status
- **Load Balancer**: Check target group health in EC2 console

## Security Considerations

- Tasks run in private subnets with NAT gateway for outbound internet access
- Security groups restrict inbound traffic to load balancer only
- Consider using HTTPS with SSL certificates for production
- Use AWS Secrets Manager for sensitive configuration

## Cost Optimization

- Uses 1 NAT gateway instead of one per AZ
- Fargate Spot instances can reduce costs (add `capacityProviders`)
- Set appropriate log retention policies
- Consider using smaller instance sizes for development

## Cleanup

To destroy all resources:
```bash
cdk destroy
```

## Troubleshooting

1. **Health Check Failures**: Ensure `/actuator/health` endpoint returns 200
2. **Image Pull Errors**: Verify ECR permissions and image URI
3. **Task Won't Start**: Check CloudWatch logs for startup errors
4. **High Memory Usage**: Increase memory limits or optimize application

## Next Steps

- Set up CI/CD pipeline for automated deployments
- Add RDS database and configure connection
- Implement blue/green deployments
- Add SSL/TLS termination at load balancer
- Set up monitoring and alerting with CloudWatch alarms

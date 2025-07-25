# Infrastructure Guide

This enhanced CDK project deploys a complete Spring Boot application infrastructure with:

## Architecture Components

### 🌐 **Networking**
- **VPC**: 3-tier subnet architecture
  - Public subnets: Load balancer and jumphost
  - Private subnets: ECS Fargate tasks
  - Database subnets: RDS instances (isolated)
- **Route53**: DNS management with SSL certificate
- **Domain**: `spring.oazis.site` pointing to load balancer

### 🔒 **Security**
- **SSL/TLS**: Automatic certificate provisioning via ACM
- **Security Groups**: Proper network isolation
- **Secrets Manager**: Database credentials management
- **IAM Roles**: Least privilege access

### 🗄️ **Database**
- **RDS PostgreSQL 15**: Production-ready database
- **Multi-AZ**: Automatic failover capability
- **Backup**: 7-day retention policy
- **Storage**: Auto-scaling from 20GB to 100GB

### 🖥️ **Compute**
- **ECS Fargate**: Serverless container platform
- **Auto Scaling**: 1-10 instances based on CPU/Memory
- **Load Balancer**: Application Load Balancer with health checks
- **EC2 Jumphost**: Testing and troubleshooting instance

## 🔑 **Access Methods**

### Application Access
```bash
# Production URL (HTTPS with SSL)
https://spring.oazis.site

# Load Balancer Direct Access
https://[ALB-DNS-NAME]
```

### Jumphost Access
```bash
# SSH to jumphost (download key from AWS Systems Manager)
aws ec2 describe-key-pairs --key-names springboot-jumphost-key
aws ssm get-parameter --name /ec2/keypair/{key-pair-id} --with-decryption --query Parameter.Value --output text > jumphost-key.pem
chmod 400 jumphost-key.pem
ssh -i jumphost-key.pem ec2-user@[JUMPHOST-PUBLIC-IP]

# Or use Session Manager (no SSH key needed)
aws ssm start-session --target [JUMPHOST-INSTANCE-ID]
```

### Database Access
```bash
# From jumphost, connect to RDS
# Get credentials from Secrets Manager first
aws secretsmanager get-secret-value --secret-id [SECRET-ARN] --query SecretString --output text

# Connect to PostgreSQL
psql -h [DATABASE-ENDPOINT] -U springboot -d springbootdb
```

## 🛠️ **Useful Commands**

### Deployment
```bash
# Full deployment
./deploy.sh

# Deploy with approval prompts
npm run build && cdk deploy

# Check differences before deploy
npm run diff
```

### Monitoring
```bash
# View ECS service status
aws ecs describe-services --cluster spring-boot-cluster --services spring-boot-service

# View logs
aws logs tail /ecs/spring-boot-app --follow

# Check database status
aws rds describe-db-instances --db-instance-identifier [DB-IDENTIFIER]
```

### Troubleshooting from Jumphost
```bash
# Check if application is responding
curl -k https://spring.oazis.site

# Test database connectivity
pg_isready -h [DATABASE-ENDPOINT] -p 5432

# View ECS task logs
aws logs get-log-events --log-group-name /ecs/spring-boot-app --log-stream-name [STREAM-NAME]

# Connect to running container (if needed)
aws ecs execute-command --cluster spring-boot-cluster --task [TASK-ARN] --container web --interactive --command "/bin/sh"
```

## 🔍 **Security Groups Rules**

### Application Load Balancer
- **Inbound**: Port 80 (HTTP) and 443 (HTTPS) from 0.0.0.0/0
- **Outbound**: Port 8080 to ECS security group

### ECS Tasks
- **Inbound**: Port 8080 from load balancer security group
- **Outbound**: All traffic (for internet access)

### RDS Database
- **Inbound**: Port 5432 from ECS and jumphost security groups
- **Outbound**: None

### Jumphost
- **Inbound**: Port 22 (SSH) from 0.0.0.0/0
- **Outbound**: All traffic

## 📊 **Monitoring & Logging**

### CloudWatch Logs
- **ECS Logs**: `/ecs/spring-boot-app`
- **Application Logs**: JSON formatted with timestamps

### CloudWatch Metrics
- **ECS**: CPU, Memory, Task count
- **ALB**: Request count, latency, error rates
- **RDS**: CPU, connections, read/write IOPS

### Health Checks
- **ALB Target Group**: HTTP GET to `/` (expects 200)
- **ECS Service**: Container health checks

## 💰 **Cost Optimization**

### Current Configuration (Estimated Monthly)
- **ECS Fargate**: ~$25-50 (2 tasks, t3.micro equivalent)
- **RDS**: ~$15-20 (t3.micro PostgreSQL)
- **ALB**: ~$22 (fixed cost)
- **NAT Gateway**: ~$45 (fixed cost)
- **EC2 Jumphost**: ~$8 (t3.micro)
- **Route53**: ~$0.50 (hosted zone)
- **Data Transfer**: Variable

### Optimization Tips
- Use Fargate Spot for non-production
- Consider Aurora Serverless for variable workloads
- Use VPC endpoints to reduce NAT Gateway costs
- Implement lifecycle policies for logs

## 🚨 **Production Considerations**

### Security Hardening
```typescript
// Set these for production in CDK:
deletionProtection: true,        // RDS
removalPolicy: cdk.RemovalPolicy.RETAIN,  // Critical resources
```

### High Availability
- Multi-AZ RDS deployment
- Auto Scaling across multiple AZs
- Health checks and automatic replacement

### Backup Strategy
- RDS automated backups (7 days)
- ECS service auto-recovery
- Infrastructure as Code (CDK) for disaster recovery

## 🔧 **Customization Options**

### Environment Variables
Update in `lib/ecs-project-stack.ts`:
```typescript
environment: {
  'SPRING_PROFILES_ACTIVE': 'prod',
  'CUSTOM_CONFIG': 'value'
}
```

### Scaling Parameters
```typescript
// Auto scaling thresholds
targetUtilizationPercent: 70,  // CPU
targetUtilizationPercent: 80,  // Memory

// Instance limits
minCapacity: 1,
maxCapacity: 10
```

### Database Configuration
```typescript
// Instance size
instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),

// Storage
allocatedStorage: 100,
maxAllocatedStorage: 1000,
```

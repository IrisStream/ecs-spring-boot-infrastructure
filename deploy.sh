#!/bin/bash

# Simple deployment script for Spring Boot ECS project
set -e

echo "🚀 Starting Spring Boot ECS deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building CDK project..."
npm run build

# Bootstrap CDK if needed
echo "🏗️  Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit >/dev/null 2>&1; then
    echo "🚀 Bootstrapping CDK..."
    npx cdk bootstrap
else
    echo "✅ CDK already bootstrapped"
fi

# Deploy the stack
echo "🚀 Deploying Spring Boot application..."
echo "This will:"
echo "  - Create ECR repository"
echo "  - Build Docker image from GitHub"
echo "  - Deploy to ECS Fargate with HTTPS"
echo "  - Create RDS PostgreSQL database"
echo "  - Set up Route53 DNS (spring.oazis.site)"
echo "  - Deploy EC2 jumphost for troubleshooting"
echo "  - Configure SSL certificate"
echo ""

npx cdk deploy --require-approval never

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Access Information:"
echo "  🌐 Application URL: https://spring.oazis.site"
echo "  🔐 SSH Key: Check AWS Systems Manager for 'springboot-jumphost-key'"
echo "  🗄️  Database: Check AWS Secrets Manager for credentials"
echo ""
echo "⏱️  Please wait 5-10 minutes for:"
echo "  - SSL certificate validation"
echo "  - ECS service to start"
echo "  - Database to become available"
echo ""
echo "🔍 Monitoring:"
echo "  - ECS Service: AWS Console > ECS > Clusters > spring-boot-cluster"
echo "  - Logs: AWS Console > CloudWatch > Log Groups > /ecs/spring-boot-app"
echo "  - Database: AWS Console > RDS > Databases"
echo "  - Jumphost: AWS Console > EC2 > Instances"

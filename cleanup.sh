#!/bin/bash

# Cleanup script for Spring Boot ECS project
set -e

echo "🧹 Cleaning up Spring Boot ECS deployment..."

# Confirm with user
read -p "This will destroy all AWS resources created by this project. Are you sure? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo "🗑️  Destroying CDK stack..."
npx cdk destroy --force

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🔍 Manual cleanup (if needed):"
echo "  - ECR images are retained by default"
echo "  - CloudWatch logs are deleted"
echo "  - VPC and all networking components are deleted"
echo "  - RDS database and backups are deleted"
echo "  - Route53 records are deleted (hosted zone remains)"
echo "  - SSL certificate is deleted"
echo "  - EC2 key pair is deleted"
echo "  - Secrets Manager secret is deleted"

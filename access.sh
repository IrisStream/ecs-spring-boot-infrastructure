#!/bin/bash

# Helper script for accessing infrastructure components
set -e

echo "🔧 Spring Boot Infrastructure Access Helper"
echo ""

# Get stack outputs
STACK_NAME="EcsProjectStack"

get_output() {
    aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text 2>/dev/null || echo "Not found"
}

JUMPHOST_IP=$(get_output "JumphostPublicIP")
JUMPHOST_ID=$(get_output "JumphostInstanceId")
DATABASE_ENDPOINT=$(get_output "DatabaseEndpoint")
SECRET_ARN=$(get_output "DatabaseSecretArn")
KEY_PAIR_NAME=$(get_output "SSHKeyPairName")

echo "📊 Infrastructure Status:"
echo "  🖥️  Jumphost IP: $JUMPHOST_IP"
echo "  🔑 Key Pair: $KEY_PAIR_NAME"
echo "  🗄️  Database: $DATABASE_ENDPOINT"
echo "  🌐 Application: https://spring.oazis.site"
echo ""

echo "Select an option:"
echo "1) Connect to jumphost via SSH"
echo "2) Connect to jumphost via Session Manager (no SSH key needed)"
echo "3) Get database credentials"
echo "4) Download SSH private key"
echo "5) Test application connectivity"
echo "6) View ECS service status"
echo "7) View application logs"
echo "8) Exit"
echo ""

read -p "Enter your choice (1-8): " choice

case $choice in
    1)
        if [ -f "jumphost-key.pem" ]; then
            echo "🔐 Connecting via SSH..."
            ssh -i jumphost-key.pem ec2-user@$JUMPHOST_IP
        else
            echo "❌ SSH key file 'jumphost-key.pem' not found."
            echo "💡 Use option 4 to download the key first, or option 2 for Session Manager."
        fi
        ;;
    2)
        echo "🔐 Starting Session Manager session..."
        aws ssm start-session --target $JUMPHOST_ID
        ;;
    3)
        echo "🔑 Database credentials:"
        aws secretsmanager get-secret-value --secret-id $SECRET_ARN --query SecretString --output text | jq .
        echo ""
        echo "💡 Connection command from jumphost:"
        echo "psql -h $DATABASE_ENDPOINT -U springboot -d springbootdb"
        ;;
    4)
        echo "📥 Downloading SSH private key..."
        KEY_PAIR_ID=$(aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --query 'KeyPairs[0].KeyPairId' --output text)
        aws ssm get-parameter --name "/ec2/keypair/$KEY_PAIR_ID" --with-decryption --query Parameter.Value --output text > jumphost-key.pem
        chmod 400 jumphost-key.pem
        echo "✅ SSH key saved as 'jumphost-key.pem'"
        ;;
    5)
        echo "🌐 Testing application connectivity..."
        echo "Testing HTTPS endpoint..."
        if curl -s -o /dev/null -w "%{http_code}" https://spring.oazis.site | grep -q "200"; then
            echo "✅ Application is responding"
            echo "Response:"
            curl -s https://spring.oazis.site | jq .
        else
            echo "❌ Application not responding"
            echo "🔍 Check ECS service status and logs"
        fi
        ;;
    6)
        echo "📊 ECS Service Status:"
        aws ecs describe-services --cluster spring-boot-cluster --services spring-boot-service --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition}' --output table
        echo ""
        echo "📋 Recent tasks:"
        aws ecs list-tasks --cluster spring-boot-cluster --service-name spring-boot-service --query 'taskArns' --output table
        ;;
    7)
        echo "📝 Application logs (last 10 minutes):"
        aws logs tail /ecs/spring-boot-app --since 10m --follow
        ;;
    8)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

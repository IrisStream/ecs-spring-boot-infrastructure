# 🚀 GitHub Setup & CI/CD Quick Start

## 📋 Prerequisites Checklist

Before pushing to GitHub, ensure you have:
- [x] Git repository initialized and committed ✅
- [ ] GitHub repository created
- [ ] AWS credentials ready
- [ ] Domain configured (spring.oazis.site)

## 🏃‍♂️ Quick Setup (5 minutes)

### 1. Create GitHub Repository
```bash
# Option A: Create via GitHub CLI (if installed)
gh repo create ecs-spring-boot-infrastructure --public --description "AWS ECS Spring Boot infrastructure with CDK and CI/CD"

# Option B: Create manually at https://github.com/new
# Repository name: ecs-spring-boot-infrastructure
# Description: AWS ECS Spring Boot infrastructure with CDK and CI/CD
# Public repository
# Don't initialize with README (we already have one)
```

### 2. Push to GitHub
```bash
# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/ecs-spring-boot-infrastructure.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Configure GitHub Secrets
Go to your repository → Settings → Secrets and variables → Actions

#### Required Secrets:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
CDK_DEFAULT_ACCOUNT=123456789012
```

#### Optional (for multi-environment):
```
AWS_ACCESS_KEY_ID_STAGING=AKIA...
AWS_SECRET_ACCESS_KEY_STAGING=...
CDK_DEFAULT_ACCOUNT_STAGING=123456789012

AWS_ACCESS_KEY_ID_PROD=AKIA...
AWS_SECRET_ACCESS_KEY_PROD=...
CDK_DEFAULT_ACCOUNT_PROD=123456789012
```

### 4. Set Up Environment Protection
1. Go to Settings → Environments
2. Create environments: `development`, `staging`, `production`
3. For production:
   - Add required reviewers
   - Set deployment branches to `main` only

### 5. Test the Pipeline
```bash
# Make a small change to trigger workflow
echo "# Testing CI/CD" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push
```

## 🎯 Next Steps

### Immediate (Required)
1. **Configure AWS credentials** in GitHub Secrets
2. **Test deployment** with a small change
3. **Verify application** at https://spring.oazis.site

### Soon (Recommended)
1. **Set up branch protection** rules
2. **Configure environment protection** for production
3. **Add team members** as reviewers
4. **Set up monitoring** and alerts

### Later (Optional)
1. **Add ESLint/Prettier** for code formatting
2. **Configure Codecov** for coverage reporting
3. **Set up Slack/Teams** notifications
4. **Add end-to-end tests**

## 🛠️ AWS IAM Setup

### Create IAM User for GitHub Actions
```bash
# Create IAM user
aws iam create-user --user-name github-actions-ecs-deploy

# Attach policies (adjust as needed)
aws iam attach-user-policy --user-name github-actions-ecs-deploy --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Create access key
aws iam create-access-key --user-name github-actions-ecs-deploy
```

### Minimal IAM Policy (Security Focused)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "ec2:*",
        "ecs:*",
        "ecr:*",
        "elasticloadbalancing:*",
        "route53:GetHostedZone",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange",
        "rds:*",
        "secretsmanager:*",
        "logs:*",
        "iam:PassRole",
        "iam:GetRole",
        "acm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🔍 Workflow Overview

### What Happens on Push to Main:
1. **🧪 CI Jobs** (parallel)
   - TypeScript compilation
   - Unit tests with coverage
   - Security audit
   - CDK synthesis validation

2. **🚀 CD Jobs** (sequential)
   - Deploy to Development (automatic)
   - Deploy to Staging (after dev success)
   - Deploy to Production (after staging success)

### What Happens on Pull Request:
1. **🔍 Validation**
   - All CI checks
   - CDK diff preview
   - Automated PR comment with results

## 🆘 Troubleshooting

### Common Issues:

#### Workflow Fails: "CDK_DEFAULT_ACCOUNT not set"
```bash
# Add this secret in GitHub:
CDK_DEFAULT_ACCOUNT=123456789012  # Your AWS account ID
```

#### Workflow Fails: "Access Denied"
- Check AWS credentials in GitHub Secrets
- Verify IAM user has required permissions
- Ensure credentials are not expired

#### Deployment Fails: "Stack already exists"
```bash
# If needed, destroy and redeploy
npx cdk destroy EcsProjectStack --force
git push  # This will trigger redeployment
```

#### Route53 Issues: "Hosted zone not found"
- Verify domain ownership
- Check hosted zone exists in Route53
- Update domain in `bin/ecs-project.ts` if different

## 📊 Monitoring Your Deployment

### Check Deployment Status:
1. **GitHub Actions**: Repository → Actions tab
2. **AWS CloudFormation**: AWS Console → CloudFormation
3. **Application Health**: https://spring.oazis.site/actuator/health
4. **ECS Service**: AWS Console → ECS → Clusters

### Key Metrics to Watch:
- Deployment success rate
- Application response time
- ECS service health
- RDS connection count
- ALB request count

## 🎉 Success Criteria

Your setup is complete when:
- [x] ✅ Repository pushed to GitHub
- [ ] ✅ GitHub Actions workflow passes
- [ ] ✅ Application accessible at https://spring.oazis.site
- [ ] ✅ Database connection working
- [ ] ✅ Pull request workflow validates changes
- [ ] ✅ Team can deploy with confidence

---

**🚀 Ready to deploy? Follow the steps above and you'll have a production-ready Spring Boot application running on AWS ECS with full CI/CD automation!**

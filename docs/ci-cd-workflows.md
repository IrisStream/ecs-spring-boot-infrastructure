# 🚀 CI/CD Workflows Documentation

This document describes the GitHub Actions workflows configured for the ECS Spring Boot project.

## 📋 Overview

The project includes 4 main workflows:
- **🚀 Deploy**: Main CI/CD pipeline for building, testing, and deploying
- **🔍 PR Validation**: Validates pull requests before merge
- **🧹 Cleanup**: Safely destroys infrastructure when needed
- **🔄 Dependencies**: Automated dependency updates

## 🚀 Main Deployment Workflow (`deploy.yml`)

### Triggers
- Push to `main`/`master` branch
- Pull requests to `main`/`master` branch
- Manual dispatch with environment selection

### Jobs

#### 🧪 Lint & Test
- TypeScript compilation
- Unit tests with coverage
- CDK synthesis validation
- Runs on all pushes and PRs

#### 🔒 Security Scan
- npm audit for vulnerabilities
- CDK security validation
- Runs on all pushes and PRs

#### 🚀 Deploy to Development
- Automatic deployment after CI passes
- Only on main branch pushes
- Deploys to `development` environment
- URL: `https://spring-dev.oazis.site`

#### 🎭 Deploy to Staging
- Deploys after successful dev deployment
- Only on main branch pushes
- Requires separate AWS credentials
- URL: `https://spring-staging.oazis.site`

#### 🏭 Deploy to Production
- Deploys after successful staging deployment
- Only on main branch pushes
- Requires production AWS credentials
- URL: `https://spring.oazis.site`

### Required Secrets

#### Development Environment
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
CDK_DEFAULT_ACCOUNT
```

#### Staging Environment
```
AWS_ACCESS_KEY_ID_STAGING
AWS_SECRET_ACCESS_KEY_STAGING
CDK_DEFAULT_ACCOUNT_STAGING
```

#### Production Environment
```
AWS_ACCESS_KEY_ID_PROD
AWS_SECRET_ACCESS_KEY_PROD
CDK_DEFAULT_ACCOUNT_PROD
```

## 🔍 Pull Request Validation (`pr-validation.yml`)

### Purpose
Validates all changes before they're merged to main branch.

### Features
- Full build and test validation
- CDK synthesis check
- Infrastructure diff preview
- Automated PR comments with results
- Coverage reporting (if configured)

### PR Comment Example
```
🔍 Pull Request Validation ✅

Status: All checks passed

Validation Results:
- TypeScript Build: ✅
- Unit Tests: ✅
- CDK Synthesis: ✅

🚀 This PR is ready for review and merge!
```

## 🧹 Cleanup Workflow (`cleanup.yml`)

### Purpose
Safely destroy infrastructure when no longer needed.

### Usage
1. Go to Actions → Cleanup Infrastructure
2. Select environment (dev/staging/prod)
3. Type `DESTROY` to confirm
4. Optionally specify stack name

### Safety Features
- Manual confirmation required
- Environment-specific credentials
- Shows what will be destroyed
- Provides manual cleanup checklist

### Manual Cleanup Checklist
After running the workflow, manually check:
- ECR repositories (if not empty)
- CloudWatch log groups (if retention is set)
- Route53 hosted zone (if externally managed)
- ECS cluster (if other services exist)
- RDS snapshots (if needed for recovery)

## 🔄 Dependency Updates (`dependencies.yml`)

### Schedule
Runs every Monday at 9 AM UTC

### Features
- Security vulnerability fixes
- CDK package updates
- Automated testing after updates
- Creates PR if changes detected

### Automated PR
If updates are found, creates a PR with:
- Summary of changes
- Test validation results
- Review checklist
- Automatic branch cleanup

## 🔧 Setup Instructions

### 1. Configure AWS Credentials

For each environment, create an IAM user with programmatic access and the following permissions:

#### Required Policies
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
        "route53:*",
        "rds:*",
        "secretsmanager:*",
        "logs:*",
        "iam:*",
        "acm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Add GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions:

#### Required Secrets
- `AWS_ACCESS_KEY_ID` - Development AWS access key
- `AWS_SECRET_ACCESS_KEY` - Development AWS secret key
- `CDK_DEFAULT_ACCOUNT` - Development AWS account ID
- `AWS_ACCESS_KEY_ID_STAGING` - Staging AWS access key (optional)
- `AWS_SECRET_ACCESS_KEY_STAGING` - Staging AWS secret key (optional)
- `CDK_DEFAULT_ACCOUNT_STAGING` - Staging AWS account ID (optional)
- `AWS_ACCESS_KEY_ID_PROD` - Production AWS access key (optional)
- `AWS_SECRET_ACCESS_KEY_PROD` - Production AWS secret key (optional)
- `CDK_DEFAULT_ACCOUNT_PROD` - Production AWS account ID (optional)

#### Optional Secrets
- `CODECOV_TOKEN` - For coverage reporting

### 3. Environment Protection Rules

Set up environment protection rules in GitHub:

1. Go to Settings → Environments
2. Create environments: `development`, `staging`, `production`
3. For production:
   - Add required reviewers
   - Set deployment branches to `main` only
   - Add environment secrets

### 4. Branch Protection

Configure branch protection for `main`:
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require status checks to pass
   - Require pull request reviews
   - Dismiss stale reviews
   - Require linear history

## 🏃‍♂️ Local Development

### Quick Commands
```bash
# Validate changes locally
npm run validate

# Run CI pipeline locally
npm run ci

# Deploy manually
npm run deploy

# Check for infrastructure changes
npm run diff
```

### Pre-commit Checklist
- [ ] Tests passing: `npm test`
- [ ] Build successful: `npm run build`
- [ ] CDK synthesis works: `npm run synth`
- [ ] No TypeScript errors
- [ ] Code formatted and linted

## 🐛 Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Required
```bash
npx cdk bootstrap aws://ACCOUNT-ID/REGION
```

#### 2. Insufficient IAM Permissions
Ensure the GitHub Actions IAM user has all required permissions listed above.

#### 3. Stack Already Exists
If deployment fails due to existing stack:
```bash
# Check existing stacks
npx cdk ls

# Destroy and redeploy
npx cdk destroy EcsProjectStack
npm run deploy
```

#### 4. ECR Repository Issues
If image push fails:
```bash
# Check ECR repository exists
aws ecr describe-repositories --repository-names spring-boot-app

# Create if missing
aws ecr create-repository --repository-name spring-boot-app
```

### Debug Mode

Enable debug logging by adding to workflow environment:
```yaml
env:
  CDK_DEBUG: true
  AWS_CDK_DEBUG: true
```

## 📊 Monitoring

### Workflow Status
Monitor deployment status at:
- GitHub Actions tab
- AWS CloudFormation console
- AWS ECS console
- Application URL health checks

### Notifications
Set up notifications for:
- Failed deployments
- Security vulnerabilities
- Resource limit alerts
- Cost threshold warnings

## 🔐 Security Best Practices

1. **Rotate AWS credentials regularly**
2. **Use least privilege IAM policies**
3. **Enable AWS CloudTrail logging**
4. **Monitor for suspicious activity**
5. **Keep dependencies updated**
6. **Review PR changes carefully**
7. **Use environment-specific accounts**

## 📈 Performance Optimization

1. **Cache dependencies** - Already configured in workflows
2. **Parallel job execution** - Implemented where possible
3. **Conditional deployments** - Only deploy on main branch
4. **Incremental builds** - CDK handles efficiently
5. **Resource tagging** - For cost tracking

---

**Next Steps:**
1. Configure AWS credentials in GitHub Secrets
2. Test workflows with a sample change
3. Set up environment protection rules
4. Configure monitoring and alerts
5. Train team on workflow usage

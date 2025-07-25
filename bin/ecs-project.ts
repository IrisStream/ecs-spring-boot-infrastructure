#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcsProjectStack } from '../lib/ecs-project-stack';

const app = new cdk.App();
new EcsProjectStack(app, 'EcsProjectStack', {
  /* Environment configuration required for Route53 hosted zone lookup */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
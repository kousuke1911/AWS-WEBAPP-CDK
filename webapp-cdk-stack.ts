import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';

export class WebappCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. S3バケットの作成
    const s3Bucket = new s3.Bucket(this, 'MyS3Bucket', {
      versioned: true, // バージョン管理を有効にする場合
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にバケットも削除
      autoDeleteObjects: true, // バケットの削除時にオブジェクトも削除
    });

    // 2. CloudFrontのオリジンアクセスアイデンティティ (OAI) の作成
    const oai = new cloudfront.OriginAccessIdentity(this, 'MyOAI', {
      comment: 'OAI for accessing the S3 bucket'
    });

    // 3. S3バケットのポリシーを設定して、CloudFront OAIにアクセスを許可
    s3Bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${s3Bucket.bucketArn}/*`],
      principals: [new iam.ArnPrincipal(`arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${oai.originAccessIdentityId}`)],
    }));

    // 4. CloudFrontディストリビューションの作成
    const cloudFrontDistribution = new cloudfront.CloudFrontWebDistribution(this, 'MyCloudFront', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: s3Bucket,
            originAccessIdentity: oai, // OAIを指定
          },
          behaviors: [
            {
              isDefaultBehavior: true, // デフォルトのビヘイビアとして設定
            },
          ],
        },
      ],
    });

    // 出力: CloudFrontのURL
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${cloudFrontDistribution.distributionDomainName}`,
      description: 'The CloudFront distribution URL',
    });
  }
}


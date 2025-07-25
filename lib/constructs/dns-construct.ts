import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface DnsConstructProps {
  /**
   * The domain name to use (e.g., 'oazis.site')
   */
  readonly domainName: string;
  
  /**
   * The subdomain for the application (e.g., 'spring')
   * @default 'spring'
   */
  readonly subdomainName?: string;
  
  /**
   * Additional subject alternative names for the certificate
   * @default ['*.{domainName}']
   */
  readonly subjectAlternativeNames?: string[];
}

/**
 * DNS construct that manages Route53 hosted zone lookup and SSL certificate
 */
export class DnsConstruct extends Construct {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;
  public readonly fullDomainName: string;

  constructor(scope: Construct, id: string, props: DnsConstructProps) {
    super(scope, id);

    const subdomainName = props.subdomainName ?? 'spring';
    this.fullDomainName = `${subdomainName}.${props.domainName}`;

    // Lookup existing hosted zone
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName
    });

    // Create SSL certificate for the domain
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: this.fullDomainName,
      subjectAlternativeNames: props.subjectAlternativeNames ?? [`*.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // Add tags
    cdk.Tags.of(this.certificate).add('Component', 'DNS');
  }

  /**
   * Create an A record pointing to the given alias target
   */
  public createARecord(target: route53.RecordTarget): route53.ARecord {
    return new route53.ARecord(this, 'ARecord', {
      zone: this.hostedZone,
      recordName: this.fullDomainName.split('.')[0], // Extract subdomain
      target: target,
    });
  }
}

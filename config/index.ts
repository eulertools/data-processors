require('dotenv').config();

export const appConfig = () => ({
  config: {
    dsn_url: process.env.DSN_URL || '',
    vpc_id: process.env.VPC_ID || '',
    certificate_arn: process.env.CERTIFICATE_ARN || '',
    hosted_zone: process.env.HOSTED_ZONE || '',
    services_sg: process.env.SERVICES_SG || '',
    resources_sg: process.env.RESOURCES_SG || '',
  },
});

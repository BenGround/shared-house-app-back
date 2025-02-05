import dotenv from 'dotenv';
// @ts-ignore
import SibApiV3Sdk from 'sib-api-v3-sdk';

dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

export const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

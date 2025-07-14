import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

const config = {
  FrontEndHostedPort: process.env.FRONT_END_HOSTED_PORT as string,
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  nodeEnv: process.env.NODE_ENV,
  mongoose_uri: process.env.MONGOOSE_URI as string,

  jwt_token_secret: process.env.JWT_TOKEN_SECRET as string,
  token_expiresIn: process.env.TOKEN_EXPIRES_IN as string,
  jwt_refresh_Token_secret: process.env.JWT_REFRESH_TOKEN_SECRET as string,
  refresh_expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN as string,

  company_gmail: process.env.COMPANY_GMAIL as string,
  gmail_app_password: process.env.GMAIL_APP_PASSWORD as string,

  otp_token_duration: process.env.OTP_TOKEN_DURATION as string,

  bcrypt_salt: process.env.BCRYPT_SALT as string,

  cloudinary_name: process.env.CLOUDINARY_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,

  // ========== Firebase Credentials Starts Here ========== //
  firebase: {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
  }
  // ========== Firebase Credentials Ends Here ========== //

  
};

export default config;
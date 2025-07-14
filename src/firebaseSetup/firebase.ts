import admin from 'firebase-admin';
import config from '../config';

// Extract Firebase values
const { project_id, client_email, private_key } = config.firebase;

// Validate all required fields
if (!project_id || !client_email || !private_key) {
  throw new Error('Missing Firebase configuration: project_id, client_email, or private_key');
}

// Handle newlines and potential surrounding quotes
const formattedPrivateKey = private_key
  .replace(/\\n/g, '\n') // Convert escaped newlines to actual newlines
  .replace(/^"(.*)"$/, '$1'); // Remove surrounding double quotes if present



  if(config.nodeEnv === 'development') {
    console.log("projectId:=====>>>>>",project_id,
         "clientEmail:====*******>>>",client_email,
         "appSecretKey:======____>>>",formattedPrivateKey,)
  }

// Prevent double-initialization
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: project_id,
        clientEmail: client_email,
        privateKey: formattedPrivateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Firebase Admin init error:', err);
  }
}

export default admin;

import admin from 'firebase-admin';
import serviceAccount from './luna-3-7e89c-firebase-adminsdk-fbsvc-a8e5a8f327.json';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
  }),
});

export default admin;

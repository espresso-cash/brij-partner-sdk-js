// main.js
import { KycPartnerClient, V1ValidationData } from './partner_client.js';
import nacl from 'tweetnacl';

(async () => {
  // Example usage of KycPartnerClient
  const authKeyPair = nacl.box.keyPair(); // Replace this with your real key pair
  const partnerClient = new KycPartnerClient({
    authKeyPair: {
      getPrivateKeyBytes: () => authKeyPair.secretKey,
      getPublicKeyBytes: () => authKeyPair.publicKey
    },
    baseUrl: 'http://your-api-endpoint.com' // Replace with your actual base URL
  });

  await partnerClient.init({
    partnerToken: 'your-partner-token', // Replace with your actual token
    secretKey: 'your-secret-key' // Replace with your actual secret key
  });

  console.log('Initialization successful.');
})();
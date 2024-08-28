import { KycPartnerClient } from './partner_client.js';
import nacl from 'tweetnacl';
import base58 from 'bs58';

(async () => {
      try {
            const base58Seed = '8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz';

            const seed = base58.decode(base58Seed);

            if (seed.length !== 32) {
                  throw new Error('Invalid seed length. Seed must be 32 bytes long.');
            }

            const authKeyPair = nacl.sign.keyPair.fromSeed(seed);

            // Example usage of KycPartnerClient
            const partnerClient = new KycPartnerClient({
                  authKeyPair: {
                        async getPrivateKeyBytes() {
                              return authKeyPair.secretKey;
                        },
                        async getPublicKeyBytes() {
                              return authKeyPair.publicKey;
                        }
                  },
                  baseUrl: 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app'
            });

            await partnerClient.init({
                  partnerToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpc3N1ZWRGb3IiOiJISFY1am9CNkQ0YzJwaWdWWmNROVJZNXN1RE12QWlIQkxMQkNGcW1XdU00RSIsImlhdCI6MTcyNDc3MDA2OSwiaXNzIjoiR1dNM2FoMndHUkFYVnhvYjV4d2FBeWhUSDhSeldUZnFhaHFkNVgyODFiYUMifQ.y4i07CWVDoZ1sM15Zb73EH7gNx_MFZpPURX-zOc_bYYw_1lGgL2cIxeLAQSntDcqglFKIQKqxUGRnJyOkCVWDQ",
                  secretKey: '6ZV86tt5PQ1p584yDnWGpXpGQcdLLWoTAeJC8Jcp5kwo'
            });

            await partnerClient.getData({
                  userPK: '9J4eLDHUuW7Kva4cy2S3vJEUvq8GA15Sv1vnEyt5XAXZ',
                  secretKey: '6ZV86tt5PQ1p584yDnWGpXpGQcdLLWoTAeJC8Jcp5kwo'
            });

            console.log('Initialization successful.');
      } catch (error) {
            console.error('Error during initialization:', error);
      }
})();
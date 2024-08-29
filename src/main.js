import { KycPartnerClient } from './partner_client.js';
import nacl from 'tweetnacl';
import base58 from 'bs58';

(async () => {
      try {
            const baseURL = 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app';

            const userPK = '919m6ZtJUffeUs1xC97kesELuGn5xLdF5vQ5vxGs91ii';
            const secretKey = '7NRW281BKXt96ANtxHLys2iVAPa79S2M6bmzQAFhLYtv';

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
                  baseUrl: baseURL,
            });

            await partnerClient.init();

            console.log('Initialization successful.');

            const getData = await partnerClient.getData({
                  userPK: userPK,
                  secretKey: secretKey,
            });

            console.log('getData:', getData);

            const getValidationResult = await partnerClient.getValidationResult({
                  key: 'kycSmileId',
                  secretKey: secretKey,
                  userPK: userPK,
            });

            console.log('getValidationResult:', getValidationResult);

      } catch (error) {
            console.error('Error during initialization:', error);
      }
})();
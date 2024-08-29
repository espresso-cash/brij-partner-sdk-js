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

            await partnerClient.init();

            console.log('Initialization successful.');

            const getData = await partnerClient.getData({
                  userPK: 'Fqejxi9cBSkUD3VPG8QSqQLySWKwSprGnuVPeiNW9jh8',
                  secretKey: '7KFykNxNyzhMr85V8BGzA9MR5ommGgpmHdfBuPkEV4Gw'
            });

            console.log('getData:', getData);

            const getValidationResult = await partnerClient.getValidationResult({
                  key: 'kycSmileId',
                  userPK: 'Fqejxi9cBSkUD3VPG8QSqQLySWKwSprGnuVPeiNW9jh8',
                  secretKey: '7KFykNxNyzhMr85V8BGzA9MR5ommGgpmHdfBuPkEV4Gw'
            });

            console.log('getValidationResult:', getValidationResult);

      } catch (error) {
            console.error('Error during initialization:', error);
      }
})();
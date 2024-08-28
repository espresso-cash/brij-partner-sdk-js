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
                  partnerToken: "",
                  secretKey: '8gaVEuztm75uMq11TVRBDUexZmiFeFgCYRTn8ox6QS75'
            });

            await partnerClient.getData({
                  userPK: '9XQ8RgeyBuoWs7Sx29X4ZWKatoq5Rd6YQ7ZeqDR7BSJf',
                  secretKey: '8gaVEuztm75uMq11TVRBDUexZmiFeFgCYRTn8ox6QS75'
            });

            console.log('Initialization successful.');
      } catch (error) {
            console.error('Error during initialization:', error);
      }
})();
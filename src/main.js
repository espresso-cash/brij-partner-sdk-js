import { KycPartnerClient } from './partner_client.js';
import nacl from 'tweetnacl';
import base58 from 'bs58';

(async () => {
      try {
            const baseURL = 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app';

            const seed = base58.decode('8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz');
            const authKeyPair = nacl.sign.keyPair.fromSeed(seed);

            const userPK = 'H3rpRiSxVn5VWfjvWHorUcFjRgLZncXZWaSnQZtw1evx';
            const secretKey = 'BhQsVWuRtnmKjd1L9vLnncMYoQx3GTMQiEKHWbqy25Ga';

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
            const currentDate = new Date().toISOString();
            await partnerClient.setValidationResult({
                  value: { kycSmileId: `passed ${currentDate}` },
                  secretKey: secretKey,
                  userPK: userPK,
            });

            console.log('setValidationResult Done');

            const getValidationResult = await partnerClient.getValidationResult({
                  key: 'kycSmileId',
                  secretKey: secretKey,
                  userPK: userPK,
            });

            console.log('getValidationResult:', getValidationResult);

            const orderId = 'ca938ea9-7d02-47ad-88c1-1270be8d2581';
            const order = await partnerClient.getOrder(orderId);
            console.log('fetch order:', order);

      } catch (error) {
            console.error('Error:', error);
      }
})();
import { KycPartnerClient } from './partner_client.js';
import nacl from 'tweetnacl';
import base58 from 'bs58';

const initializeClient = async () => {
      console.log('--- Initialize Client ---');

      const baseURL = 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app';
      const seed = base58.decode('8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz');
      const authKeyPair = nacl.sign.keyPair.fromSeed(seed);

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

      return partnerClient;
};

const apiUsage = async (partnerClient) => {
      console.log('--- Basic Usage ---');

      const userPK = 'C93mPv5wjbEuPvHkXXbWK4EDv9QDKhGMkUgxtdWUEVXP';

      const userSecretKey = await partnerClient.getUserSecretKey(userPK);
      console.log('userSecretKey:', userSecretKey);

      const secretKey = userSecretKey;

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

      const generatedKeyPair = await KycPartnerClient.generateKeyPair();
      console.log('Generated Public Key:', generatedKeyPair.publicKey);
}

const orderUsage = async (partnerClient) => {
      console.log('--- Order Usage ---');

      const orderId = '1a0502d4-b597-448c-a595-68cda906e5b7';
      let order = await partnerClient.getOrder(orderId);
      console.log('fetch order:', order);

      // await partnerClient.acceptOrder(orderId);
      // console.log('acceptOrder Done');
      // order = await partnerClient.getOrder(orderId);
      // console.log('updated order:', order);

      // await partnerClient.completeOrder(orderId);
      // console.log('completeOrder Done');
      // order = await partnerClient.getOrder(orderId);
      // console.log('updated order:', order);

      // await partnerClient.failOrder(orderId);
      // console.log('failOrder Done');
      // order = await partnerClient.getOrder(orderId);
      // console.log('updated order:', order);

      // await partnerClient.rejectOrder(orderId);
      // console.log('rejectOrder Done');
      // order = await partnerClient.getOrder(orderId);
      // console.log('updated order:', order);

      const ordersResponse = await partnerClient.getPartnerOrders();
      console.log('Partner orders:');
      const orders = ordersResponse.orders || [];
      orders.forEach((order, index) => {
            console.log(`Order ${index + 1}:`, order);
      });
}

const complexUsage = async (partnerClient) => {
      console.log('--- Webhook Usage ---');
      //TODO add webhook example
}

(async () => {
      try {
            const partnerClient = await initializeClient();
            await apiUsage(partnerClient);
            await orderUsage(partnerClient);
            await complexUsage(partnerClient);
      } catch (error) {
            console.error('Error:', error);
      }
})();
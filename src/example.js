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

      // Accept order
      // await partnerClient.acceptOrder(orderId);
      // console.log('acceptOrder Done');

      // Reject order
      // await partnerClient.rejectOrder(orderId);
      // console.log('rejectOrder Done');

      // Complete order
      // await partnerClient.completeOrder(orderId);
      // console.log('completeOrder Done');

      // Fail order
      // await partnerClient.failOrder(orderId);
      // console.log('failOrder Done');

      order = await partnerClient.getOrder(orderId);
      console.log('updated order:', order);

      const ordersResponse = await partnerClient.getPartnerOrders();
      console.log('Partner orders:');
      const orders = ordersResponse.orders || [];
      orders.forEach((order, index) => {
            console.log(`Order ${index + 1}:`, order);
      });
}

const partnerFlowSampleUsage = async (partnerClient) => {
      // 0. Mocked user and order
      const userPK = 'C93mPv5wjbEuPvHkXXbWK4EDv9QDKhGMkUgxtdWUEVXP';
      const orderId = '1a0502d4-b597-448c-a595-68cda906e5b7';

      console.log('--- Webhook Example Usage ---');

      // 1. Get user secret key 
      const secretKey = await partnerClient.getUserSecretKey(userPK);

      // 2. Get KYC result
      const kycValidationResult = await partnerClient.getValidationResult({
            key: 'kycSmileId',
            secretKey: secretKey,
            userPK: userPK,
      });

      // KYC should return JSON result of validation. Ie: for Nigeria, it is SmileID result
      // You can do more validation of user here
      if (!kycValidationResult?.includes('passed')) {
            // Reject order if KYC not completed
            await partnerClient.rejectOrder(orderId, 'KYC not completed');

            return;
      }

      // 3. Get phone validation result
      // Email and phone validation result are stored with hash
      // Compare validation result hash with the hash of value stored in the user data
      const phoneValidationResult = await partnerClient.getValidationResult({
            key: 'phone',
            secretKey: secretKey,
            userPK: userPK,
      });

      const getData = await partnerClient.getData({
            userPK: userPK,
            secretKey: secretKey,
      });
      const phoneHash = partnerClient.has(getData.phone);

      if (phoneValidationResult !== phoneHash) {
            // Reject order if phone not verified
            await partnerClient.rejectOrder(orderId, 'Phone not verified');

            return;
      }

      // 4. Get email validation result
      const emailValidationResult = await partnerClient.getValidationResult({
            key: 'email',
            secretKey: secretKey,
            userPK: userPK,
      });

      const emailHash = partnerClient.has(getData.email);
      if (emailValidationResult !== emailHash) {
            // Reject order if email not verified
            await partnerClient.rejectOrder(orderId, 'Email not verified');

            return;
      }

      // 5. Get order details
      const order = await partnerClient.getOrder(orderId);
      const cryptoAmount = order.cryptoAmount;
      const cryptoCurrency = order.cryptoCurrency;
      const fiatAmount = order.fiatAmount;
      const fiatCurrency = order.fiatCurrency;
      // 6. Do sanity checks on the order, confirm if you can process the order


      // 7. If you can't process the order, reject the order
      // 8. If you can process the order, accept the order
      await partnerClient.acceptOrder(orderId);
}

(async () => {
      try {
            const partnerClient = await initializeClient();
            await apiUsage(partnerClient);
            await orderUsage(partnerClient);
            // await partnerFlowSampleUsage(partnerClient);
      } catch (error) {
            console.error('Error:', error);
      }
})();

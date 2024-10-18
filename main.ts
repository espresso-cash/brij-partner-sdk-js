import { XFlowPartnerClient } from './dist'

async function main() {
      try {
            const seed = '8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz';
            const xflowClient = await XFlowPartnerClient.fromSeed(seed);
            const userPK = 'AthJeHkrQeBahrjNVUZiigveQNchihJbrZtwP7qxVEPa';
            const userSecretKey = await xflowClient.getUserSecretKey(userPK);
            const userData = await xflowClient.getUserData({
                  userPK: userPK,
                  secretKey: userSecretKey,
            });
            console.log(JSON.stringify(userData, null, 2));
      } catch (error) {
            console.error('An error occurred:', error);
      }
}
main();


// npx tsx main.ts
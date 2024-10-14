import { XFlowPartnerClient } from '../dist'

async function main() {
      try {
            const seed = '8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz';
            const xflowClient = await XFlowPartnerClient.fromSeed(seed);

            const userPK = 'G6Zc2W61teXir32BVshg1qjLRrRtSk88HLgFvHFBaMsP';

            const userSecretKey = await xflowClient.getUserSecretKey(userPK);
            
            const userData = await xflowClient.getData({
                  userPK: userPK,
                  secretKey: userSecretKey,
            });

      } catch (error) {
            console.error('An error occurred:', error);
      }
}

main();
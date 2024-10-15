import { XFlowPartnerClient } from '../dist'

async function main() {
      try {
            const seed = '8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz';
            const xflowClient = await XFlowPartnerClient.fromSeed(seed);

            const userPK = 'AX5cLMnzqrpkwwHVyvRouB3TMnMMiTMfAtYEgCubPtdZ';

            const userSecretKey = await xflowClient.getUserSecretKey(userPK);
            
            const userData = await xflowClient.getUserData({
                  userPK: userPK,
                  secretKey: userSecretKey,
            });

            console.log(userData);

      } catch (error) {
            console.error('An error occurred:', error);
      }
}

main();
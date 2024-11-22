import { BrijPartnerClient } from "./dist/index.js";

async function main() {
  try {
    const seed = "8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz";
    const brijClient = await BrijPartnerClient.fromSeed(seed);
    const userPK = "AthJeHkrQeBahrjNVUZiigveQNchihJbrZtwP7qxVEPa";
    const userSecretKey = await brijClient.getUserSecretKey(userPK);
    const userData = await brijClient.getUserData({
      userPK: userPK,
      secretKey: userSecretKey,
    });
    console.log(JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
main();

// npx tsx main.ts

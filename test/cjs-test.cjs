// Test CommonJS require
const { AppConfig, BrijPartnerClient } = require("../dist/index.cjs");

async function testCJS() {
  try {
    // Test AppConfig
    const config = AppConfig.demo();
    console.log("CommonJS require successful!");
    console.log("Demo config:", {
      storageBaseUrl: config.storageBaseUrl,
      orderBaseUrl: config.orderBaseUrl,
    });

    // Test key pair generation
    console.log("\nTesting key pair generation...");
    const keyPair = await BrijPartnerClient.generateKeyPair();
    console.log("Key pair generated successfully:", keyPair);
  } catch (error) {
    console.error("CommonJS require failed:", error);
  }
}

testCJS();

// Test ESM imports
import { AppConfig, BrijPartnerClient } from "../dist/index.js";

async function testESM() {
  try {
    // Test AppConfig
    const config = AppConfig.demo();
    console.log("ESM import successful!");
    console.log("Demo config:", {
      storageBaseUrl: config.storageBaseUrl,
      orderBaseUrl: config.orderBaseUrl,
    });

    // Test key pair generation
    console.log("\nTesting key pair generation...");
    const keyPair = await BrijPartnerClient.generateKeyPair();
    console.log("Key pair generated successfully:", keyPair);
  } catch (error) {
    console.error("ESM import failed:", error);
  }
}

testESM();

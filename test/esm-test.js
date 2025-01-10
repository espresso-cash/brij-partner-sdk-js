// Test ESM imports
import { AppConfig } from "../dist/index.js";

async function testESM() {
  try {
    const config = AppConfig.demo();
    console.log("ESM import successful!");
    console.log("Demo config:", {
      storageBaseUrl: config.storageBaseUrl,
      orderBaseUrl: config.orderBaseUrl,
    });
  } catch (error) {
    console.error("ESM import failed:", error);
  }
}

testESM();

// Test CommonJS require
const { AppConfig } = require("../dist/index.cjs");

async function testCJS() {
  try {
    const config = AppConfig.demo();
    console.log("CommonJS require successful!");
    console.log("Demo config:", {
      storageBaseUrl: config.storageBaseUrl,
      orderBaseUrl: config.orderBaseUrl,
    });
  } catch (error) {
    console.error("CommonJS require failed:", error);
  }
}

testCJS();

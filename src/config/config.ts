export class AppConfig {
      readonly storageBaseUrl: string;
      readonly orderBaseUrl: string;
      readonly verifierAuthPk: string;
    
      private constructor(
        storageBaseUrl: string,
        orderBaseUrl: string,
        verifierAuthPk: string
      ) {
        this.storageBaseUrl = storageBaseUrl;
        this.orderBaseUrl = orderBaseUrl;
        this.verifierAuthPk = verifierAuthPk;
      }
    
      static demo(): AppConfig {
        return new AppConfig(
          'https://storage-demo.brij.fi/',
          'https://orders-demo.brij.fi/',
          'HHV5joB6D4c2pigVZcQ9RY5suDMvAiHBLLBCFqmWuM4E'
        );
      }
    
      static production(): AppConfig {
        return new AppConfig(
          'https://storage.brij.fi/',
          'https://orders.brij.fi/',
          '88tFG8dt9ZacDZb7QP5yiDQeA7sVXvr7XCwZEQSsnCkJ'
        );
      }
    
      static custom({
        storageBaseUrl,
        orderBaseUrl,
        verifierAuthPk,
      }: {
        storageBaseUrl: string;
        orderBaseUrl: string;
        verifierAuthPk: string;
      }): AppConfig {
        return new AppConfig(
          storageBaseUrl,
          orderBaseUrl,
          verifierAuthPk
        );
      }
    }
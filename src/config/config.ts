export class AppConfig {
      readonly storageBaseUrl: string;
      readonly orderBaseUrl: string;
      readonly storageGrpcBaseUrl: string;
      readonly orderGrpcBaseUrl: string;
      readonly verifierAuthPk: string;
    
      private constructor(
        storageBaseUrl: string,
        orderBaseUrl: string,
        storageGrpcBaseUrl: string,
        orderGrpcBaseUrl: string,
        verifierAuthPk: string
      ) {
        this.storageBaseUrl = storageBaseUrl;
        this.orderBaseUrl = orderBaseUrl;
        this.storageGrpcBaseUrl = storageGrpcBaseUrl;
        this.orderGrpcBaseUrl = orderGrpcBaseUrl;
        this.verifierAuthPk = verifierAuthPk;
      }
    
      static demo(): AppConfig {
        return new AppConfig(
          'https://storage-demo.brij.fi/',
          'https://orders-demo.brij.fi/',
          'https://storage-grpc-demo.brij.fi',
          'https://orders-grpc-demo.brij.fi',
          'HHV5joB6D4c2pigVZcQ9RY5suDMvAiHBLLBCFqmWuM4E'
        );
      }
    
      static production(): AppConfig {
        return new AppConfig(
          'https://storage.brij.fi/',
          'https://orders.brij.fi/',
          'https://storage-grpc.brij.fi',
          'https://orders-grpc.brij.fi',
          '88tFG8dt9ZacDZb7QP5yiDQeA7sVXvr7XCwZEQSsnCkJ'
        );
      }
    
      static custom({
        storageBaseUrl,
        orderBaseUrl,
        storageGrpcBaseUrl,
        orderGrpcBaseUrl,
        verifierAuthPk,
      }: {
        storageBaseUrl: string;
        orderBaseUrl: string;
        storageGrpcBaseUrl: string;
        orderGrpcBaseUrl: string;
        verifierAuthPk: string;
      }): AppConfig {
        return new AppConfig(
          storageBaseUrl,
          orderBaseUrl,
          storageGrpcBaseUrl,
          orderGrpcBaseUrl,
          verifierAuthPk
        );
      }
    }
export class AppConfig {
      readonly storageGrpcBaseUrl: string;
      readonly orderGrpcBaseUrl: string;
      readonly verifierAuthPk: string;

      private constructor(
            storageGrpcBaseUrl: string,
            orderGrpcBaseUrl: string,
            verifierAuthPk: string
      ) {
            this.storageGrpcBaseUrl = storageGrpcBaseUrl;
            this.orderGrpcBaseUrl = orderGrpcBaseUrl;
            this.verifierAuthPk = verifierAuthPk;
      }

      static demo() {
            return new AppConfig(
                  "https://storage-grpc-demo.brij.fi",
                  "https://orders-grpc-demo.brij.fi",
                  "HHV5joB6D4c2pigVZcQ9RY5suDMvAiHBLLBCFqmWuM4E"
            );
      }

      static production() {
            return new AppConfig(
                  "https://storage-grpc.brij.fi",
                  "https://orders-grpc.brij.fi",
                  "88tFG8dt9ZacDZb7QP5yiDQeA7sVXvr7XCwZEQSsnCkJ"
            );
      }

      static custom(
            storageGrpcBaseUrl: string,
            orderGrpcBaseUrl: string,

            verifierAuthPk: string
      ) {
            return new AppConfig(
                  storageGrpcBaseUrl,
                  orderGrpcBaseUrl,
                  verifierAuthPk
            );
      }
} 
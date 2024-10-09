declare class XFlowPartnerClient {
    private authKeyPair;
    private readonly baseUrl;
    private _authPublicKey;
    private _token;
    private _apiClient;
    private constructor();
    static generateKeyPair(): Promise<{
        publicKey: string;
        privateKey: string;
        secretKey: string;
        seed: string;
        getPublicKeyBytes: () => Promise<Uint8Array>;
        getPrivateKeyBytes: () => Promise<Uint8Array>;
    }>;
    static fromSeed(seed: string): Promise<XFlowPartnerClient>;
    private init;
    private _generateAuthToken;
    private _decryptData;
    getData({ userPK, secretKey }: {
        userPK: string;
        secretKey: string;
    }): Promise<any>;
    getValidationResult({ key, secretKey, userPK }: {
        key: string;
        secretKey: string;
        userPK: string;
    }): Promise<string | null>;
    getOrder(orderId: string): Promise<any>;
    getPartnerOrders(): Promise<any>;
    acceptOnRampOrder({ orderId, bankName, bankAccount }: {
        orderId: string;
        bankName: string;
        bankAccount: string;
    }): Promise<void>;
    completeOnRampOrder({ orderId, transactionId }: {
        orderId: string;
        transactionId: string;
    }): Promise<void>;
    acceptOffRampOrder({ orderId, cryptoWalletAddress }: {
        orderId: string;
        cryptoWalletAddress: string;
    }): Promise<void>;
    completeOffRampOrder({ orderId }: {
        orderId: string;
    }): Promise<void>;
    failOrder({ orderId, reason }: {
        orderId: string;
        reason: string;
    }): Promise<void>;
    rejectOrder({ orderId, reason }: {
        orderId: string;
        reason: string;
    }): Promise<void>;
    getUserInfo(publicKey: string): Promise<any>;
    getUserSecretKey(publicKey: string): Promise<string>;
    hash(value: string): Promise<string>;
    getEmail({ userPK, secretKey }: {
        userPK: string;
        secretKey: string;
    }): Promise<{
        value: any;
        verified: boolean;
    }>;
    getPhone({ userPK, secretKey }: {
        userPK: string;
        secretKey: string;
    }): Promise<{
        value: any;
        verified: boolean;
    }>;
}
export { XFlowPartnerClient };

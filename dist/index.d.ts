export type OrderIds = {
    orderId: string;
    externalId?: '';
} | {
    orderId?: '';
    externalId: string;
};
export type CompleteOnRampOrderParams = OrderIds & {
    transactionId: string;
};
export type FailOrderParams = OrderIds & {
    reason: string;
};
export type AcceptOnRampOrderParams = {
    orderId: string;
    bankName: string;
    bankAccount: string;
    externalId?: string;
};
export type AcceptOffRampOrderParams = {
    orderId: string;
    cryptoWalletAddress: string;
    externalId?: string;
};
export type RejectOrderParams = {
    orderId: string;
    reason: string;
};
export type DataAccessParams = {
    userPK: string;
    secretKey: string;
};
export type GetValidationResultParams = DataAccessParams & {
    key: string;
};
declare class XFlowPartnerClient {
    private authKeyPair;
    private readonly baseUrl;
    private _authPublicKey;
    private _token;
    private _apiClient;
    private _protoRoot;
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
    private generateAuthToken;
    private decryptData;
    getData({ userPK, secretKey }: DataAccessParams): Promise<void>;
    getValidationResult({ key, secretKey, userPK }: GetValidationResultParams): Promise<string | null>;
    getOrder({ externalId, orderId }: OrderIds): Promise<any>;
    getPartnerOrders(): Promise<any>;
    acceptOnRampOrder({ orderId, bankName, bankAccount, externalId }: AcceptOnRampOrderParams): Promise<void>;
    completeOnRampOrder({ orderId, transactionId, externalId }: CompleteOnRampOrderParams): Promise<void>;
    acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams): Promise<void>;
    completeOffRampOrder({ orderId, externalId }: OrderIds): Promise<void>;
    failOrder({ orderId, reason, externalId }: FailOrderParams): Promise<void>;
    rejectOrder({ orderId, reason }: RejectOrderParams): Promise<void>;
    getUserInfo(publicKey: string): Promise<any>;
    getUserSecretKey(publicKey: string): Promise<string>;
    private hash;
    getEmail({ userPK, secretKey }: DataAccessParams): Promise<void>;
    getPhone({ userPK, secretKey }: DataAccessParams): Promise<void>;
}
export { XFlowPartnerClient };

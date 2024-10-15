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
interface UserProfile {
    email: Array<{
        value: string;
        dataId: string;
        verified: boolean;
    }>;
    phone: Array<{
        value: string;
        dataId: string;
        verified: boolean;
    }>;
    name: Array<{
        firstName: string;
        lastName: string;
        dataId: string;
        verified: boolean;
    }>;
    birthDate: Array<{
        value: Date;
        dataId: string;
        verified: boolean;
    }>;
    document: Array<{
        type: string;
        number: string;
        dataId: string;
        verified: boolean;
    }>;
    bankInfo: Array<{
        bankName: string;
        accountNumber: string;
        bankCode: string;
        dataId: string;
        verified: boolean;
    }>;
    selfie: Array<{
        value: Uint8Array;
        dataId: string;
        verified: boolean;
    }>;
    custom: Record<string, string>;
}
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
    private generateAuthToken;
    getData({ userPK, secretKey }: DataAccessParams): Promise<UserProfile>;
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
    private decryptData;
    private generateHash;
}
export { XFlowPartnerClient };

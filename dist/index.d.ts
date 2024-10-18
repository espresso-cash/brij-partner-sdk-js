export type OrderIds = {
    orderId: string;
    externalId?: "";
} | {
    orderId?: "";
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
export type UserDataField = {
    dataId: string;
    status: ValidationStatus;
};
export type UserDataValueField<T> = {
    value: T;
} & UserDataField;
export type UserData = {
    email: Array<UserDataValueField<string>> | null;
    phone: Array<UserDataValueField<string>> | null;
    name: Array<{
        firstName: string;
        lastName: string;
    } & UserDataField> | null;
    birthDate: Array<UserDataValueField<Date>> | null;
    document: Array<{
        type: string;
        number: string;
        countryCode: string;
    } & UserDataField> | null;
    bankInfo: Array<{
        bankName: string;
        accountNumber: string;
        bankCode: string;
    } & UserDataField> | null;
    selfie: Array<UserDataValueField<Uint8Array>> | null;
    custom: Record<string, string> | null;
};
export declare enum ValidationStatus {
    Unspecified = "UNSPECIFIED",
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Unverified = "UNVERIFIED"
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
    getUserData({ userPK, secretKey }: DataAccessParams): Promise<UserData>;
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

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
    email: Array<UserDataValueField<string>>;
    phone: Array<UserDataValueField<string>>;
    name: Array<{
        firstName: string;
        lastName: string;
    } & UserDataField>;
    birthDate: Array<UserDataValueField<Date>>;
    document: Array<{
        type: string;
        number: string;
        countryCode: string;
    } & UserDataField>;
    bankInfo: Array<{
        bankName: string;
        accountNumber: string;
        bankCode: string;
    } & UserDataField>;
    selfie: Array<UserDataValueField<Uint8Array>>;
    custom: Record<string, string>;
};
export declare enum ValidationStatus {
    Unspecified = "UNSPECIFIED",
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Unverified = "UNVERIFIED"
}
export type Order = {
    orderId: string;
    externalId?: string;
    created: string;
    status: string;
    partnerPublicKey: string;
    userPublicKey: string;
    comment: string;
    type: "ON_RAMP" | "OFF_RAMP";
    cryptoAmount: string;
    cryptoCurrency: string;
    fiatAmount: string;
    fiatCurrency: string;
    bankName: string;
    bankAccount: string;
    cryptoWalletAddress: string;
    transaction: string;
    transactionId: string;
};
export declare class XFlowPartnerClient {
    private authKeyPair;
    private readonly kycBaseUrl;
    private readonly orderBaseUrl;
    private _authPublicKey;
    private _kycClient;
    private _orderClient;
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
    private createToken;
    getUserData({ userPK, secretKey }: DataAccessParams): Promise<UserData>;
    getOrder({ externalId, orderId }: OrderIds): Promise<Order>;
    getPartnerOrders(): Promise<Order[]>;
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

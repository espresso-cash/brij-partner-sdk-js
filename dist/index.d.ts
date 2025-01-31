declare class AppConfig {
    readonly storageBaseUrl: string;
    readonly orderBaseUrl: string;
    private constructor();
    static demo(): AppConfig;
    static production(): AppConfig;
    static custom(storageBaseUrl: string, orderBaseUrl: string): AppConfig;
}
type OrderIds = {
    orderId: string;
    externalId?: "";
} | {
    orderId?: "";
    externalId: string;
};
type CompleteOnRampOrderParams = OrderIds & {
    transactionId: string;
};
type FailOrderParams = OrderIds & {
    reason: string;
};
type AcceptOnRampOrderParams = {
    orderId: string;
    bankName: string;
    bankAccount: string;
    externalId?: string;
};
type AcceptOffRampOrderParams = {
    orderId: string;
    cryptoWalletAddress: string;
    externalId?: string;
};
type RejectOrderParams = {
    orderId: string;
    reason: string;
};
type DataAccessParams = {
    userPK: string;
    secretKey: string;
    includeValues?: boolean;
};
type UserDataField = {
    dataId: string;
    status: ValidationStatus;
};
type UserDataValueField<T> = {
    value: T;
} & UserDataField;
type UserData = {
    email?: UserDataValueField<string>;
    phone?: UserDataValueField<string>;
    name?: {
        firstName: string;
        lastName: string;
    } & UserDataField;
    birthDate?: UserDataValueField<Date>;
    document?: {
        type: string;
        number: string;
        countryCode: string;
    } & UserDataField;
    bankInfo?: {
        bankName: string;
        accountNumber: string;
        bankCode: string;
    } & UserDataField;
    selfie?: UserDataValueField<Uint8Array>;
    custom?: Record<string, string>;
};
declare enum ValidationStatus {
    Unspecified = "UNSPECIFIED",
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Unverified = "UNVERIFIED"
}
type Order = {
    orderId: string;
    externalId?: string;
    created: string;
    status: string;
    partnerPublicKey: string;
    userPublicKey: string;
    comment: string;
    type: "ON_RAMP" | "OFF_RAMP";
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    bankName: string;
    bankAccount: string;
    cryptoWalletAddress: string;
    transaction: string;
    transactionId: string;
    userSignature?: string;
    partnerSignature?: string;
};
declare class BrijPartnerClient {
    private authKeyPair;
    private readonly storageBaseUrl;
    private readonly orderBaseUrl;
    private _authPublicKey;
    private _storageClient;
    private _orderClient;
    private constructor();
    static generateKeyPair(): Promise<{
        publicKey: string;
        privateKey: string;
        secretKey: string;
        seed: string;
        getPublicKeyBytes: () => Promise<Uint8Array<ArrayBufferLike>>;
        getPrivateKeyBytes: () => Promise<Uint8Array<ArrayBufferLike>>;
    }>;
    static fromSeed(seed: string, appConfig?: AppConfig): Promise<BrijPartnerClient>;
    private init;
    private generateAuthToken;
    private createToken;
    getUserData({ userPK, secretKey, includeValues }: DataAccessParams): Promise<UserData>;
    private decryptOrderFields;
    private processOrder;
    getOrder({ externalId, orderId }: OrderIds): Promise<Order>;
    getPartnerOrders(): Promise<Order[]>;
    acceptOnRampOrder({ orderId, bankName, bankAccount, externalId, userSecretKey, }: AcceptOnRampOrderParams & {
        userSecretKey: string;
    }): Promise<void>;
    acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams): Promise<void>;
    completeOnRampOrder({ orderId, transactionId, externalId }: CompleteOnRampOrderParams): Promise<void>;
    completeOffRampOrder({ orderId, externalId }: OrderIds): Promise<void>;
    failOrder({ orderId, reason, externalId }: FailOrderParams): Promise<void>;
    rejectOrder({ orderId, reason }: RejectOrderParams): Promise<void>;
    getUserInfo(publicKey: string): Promise<any>;
    getUserSecretKey(publicKey: string): Promise<string>;
    private decryptData;
    private createUserOnRampMessage;
    private createUserOffRampMessage;
    private createPartnerOnRampMessage;
    private createPartnerOffRampMessage;
}

export { type AcceptOffRampOrderParams, type AcceptOnRampOrderParams, AppConfig, BrijPartnerClient, type CompleteOnRampOrderParams, type DataAccessParams, type FailOrderParams, type Order, type OrderIds, type RejectOrderParams, type UserData, type UserDataField, type UserDataValueField, ValidationStatus };

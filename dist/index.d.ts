import * as brij_protos_js_gen_brij_storage_v1_partner_service_pb from 'brij_protos_js/gen/brij/storage/v1/partner/service_pb';
import { DocumentType } from 'brij_protos_js/gen/brij/storage/v1/common/data_pb';
import { ValidationStatus as ValidationStatus$1 } from 'brij_protos_js/gen/brij/storage/v1/common/validation_data_pb';
import { KycStatus as KycStatus$1 } from 'brij_protos_js/gen/brij/storage/v1/common/kyc_pb';

declare class AppConfig {
    readonly storageBaseUrl: string;
    readonly orderBaseUrl: string;
    readonly verifierAuthPk: string;
    private constructor();
    static demo(): AppConfig;
    static production(): AppConfig;
    static custom({ storageBaseUrl, orderBaseUrl, verifierAuthPk, }: {
        storageBaseUrl: string;
        orderBaseUrl: string;
        verifierAuthPk: string;
    }): AppConfig;
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
    hash: string;
};
type UserDataValueField<T> = {
    value: T;
} & UserDataField;
type UserData = {
    email?: UserDataValueField<string> & {
        status: ValidationStatus;
    };
    phone?: UserDataValueField<string> & {
        status: ValidationStatus;
    };
    name?: {
        firstName: string;
        lastName: string;
    } & UserDataField;
    citizenship?: UserDataValueField<string>;
    birthDate?: UserDataValueField<Date>;
    documents?: ({
        type: DocumentType | string;
        number: string;
        countryCode: string;
    } & UserDataField)[];
    bankInfos?: ({
        bankName: string;
        accountNumber: string;
        bankCode: string;
        countryCode: string;
    } & UserDataField)[];
    selfie?: UserDataValueField<Uint8Array>;
};
type ValidationResult = {
    dataId: string;
    value: string;
    status: ValidationStatus;
};
declare enum ValidationStatus {
    Unspecified = "UNSPECIFIED",
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Unverified = "UNVERIFIED"
}
declare function toValidationStatus(protoStatus?: ValidationStatus$1 | undefined): ValidationStatus;
type UpdateFeesParams = {
    onRampFee?: {
        fixedFee: number;
        percentageFee: number;
        conversionRates: {
            cryptoCurrency: string;
            fiatCurrency: string;
            rate: number;
        };
    };
    offRampFee?: {
        fixedFee: number;
        percentageFee: number;
        conversionRates: {
            cryptoCurrency: string;
            fiatCurrency: string;
            rate: number;
        };
    };
    walletAddress?: string;
};
declare enum RampType {
    Unspecified = "RAMP_TYPE_UNSPECIFIED",
    OnRamp = "RAMP_TYPE_ON_RAMP",
    OffRamp = "RAMP_TYPE_OFF_RAMP"
}
type Order = {
    orderId: string;
    externalId?: string;
    created: string;
    status: string;
    partnerPublicKey: string;
    userPublicKey: string;
    comment: string;
    type: RampType;
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
    userWalletAddress?: string;
    walletPublicKey?: string;
};
declare enum KycStatus {
    Unspecified = "KYC_STATUS_UNSPECIFIED",
    Pending = "KYC_STATUS_PENDING",
    Approved = "KYC_STATUS_APPROVED",
    Rejected = "KYC_STATUS_REJECTED"
}
interface KycItem {
    countries: string[];
    status: KycStatus;
    provider: string;
    userPublicKey: string;
    hashes: string[];
    additionalData: Record<string, Uint8Array>;
}
interface KycStatusDetails {
    status: KycStatus;
    data?: KycItem;
    signature?: string;
}
declare function toKycStatus(protoStatus: KycStatus$1): KycStatus;

declare class BrijPartnerClient {
    private authKeyPair;
    private readonly storageBaseUrl;
    private readonly orderBaseUrl;
    private _authPublicKey;
    private _storageClient;
    private _orderClient;
    private readonly _verifierAuthPk;
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
    private transformToOrder;
    private mapRampType;
    acceptOnRampOrder({ orderId, bankName, bankAccount, externalId, userSecretKey, }: AcceptOnRampOrderParams & {
        userSecretKey: string;
    }): Promise<void>;
    acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams): Promise<void>;
    completeOnRampOrder({ orderId, transactionId, externalId }: CompleteOnRampOrderParams): Promise<void>;
    completeOffRampOrder({ orderId, externalId }: OrderIds): Promise<void>;
    failOrder({ orderId, reason, externalId }: FailOrderParams): Promise<void>;
    rejectOrder({ orderId, reason }: RejectOrderParams): Promise<void>;
    updateFees(params: UpdateFeesParams): Promise<void>;
    getUserInfo(publicKey: string): Promise<brij_protos_js_gen_brij_storage_v1_partner_service_pb.GetInfoResponse>;
    getUserSecretKey(publicKey: string): Promise<string>;
    getKycStatusDetails(params: {
        userPK: string;
        country: string;
        secretKey: string;
    }): Promise<KycStatusDetails>;
    private decryptData;
    private createUserOnRampMessage;
    private createUserOffRampMessage;
    private createPartnerOnRampMessage;
    private createPartnerOffRampMessage;
}

export { AppConfig, BrijPartnerClient, KycStatus, RampType, ValidationStatus, toKycStatus, toValidationStatus };
export type { AcceptOffRampOrderParams, AcceptOnRampOrderParams, CompleteOnRampOrderParams, DataAccessParams, FailOrderParams, KycItem, KycStatusDetails, Order, OrderIds, RejectOrderParams, UpdateFeesParams, UserData, UserDataField, UserDataValueField, ValidationResult };

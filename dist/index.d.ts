import * as brij_protos_js_gen_brij_storage_v1_partner_service_pb from 'brij_protos_js/gen/brij/storage/v1/partner/service_pb';
import { GetOrderResponse } from 'brij_protos_js/gen/brij/orders/v1/partner/partner_pb';
import { DocumentType } from 'brij_protos_js/gen/brij/storage/v1/common/data_pb';
import { ValidationStatus } from 'brij_protos_js/gen/brij/storage/v1/common/validation_status_pb';

declare class AppConfig {
    readonly storageBaseUrl: string;
    readonly orderBaseUrl: string;
    readonly storageGrpcBaseUrl: string;
    readonly orderGrpcBaseUrl: string;
    readonly verifierAuthPk: string;
    private constructor();
    static demo(): AppConfig;
    static production(): AppConfig;
    static custom({ storageBaseUrl, orderBaseUrl, storageGrpcBaseUrl, orderGrpcBaseUrl, verifierAuthPk, }: {
        storageBaseUrl: string;
        orderBaseUrl: string;
        storageGrpcBaseUrl: string;
        orderGrpcBaseUrl: string;
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
    dataId: string;
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
    getOrder({ externalId, orderId }: OrderIds): Promise<GetOrderResponse>;
    getPartnerOrders(): Promise<GetOrderResponse[]>;
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
    private decryptData;
    private createUserOnRampMessage;
    private createUserOffRampMessage;
    private createPartnerOnRampMessage;
    private createPartnerOffRampMessage;
}

export { AppConfig, BrijPartnerClient };
export type { AcceptOffRampOrderParams, AcceptOnRampOrderParams, CompleteOnRampOrderParams, DataAccessParams, FailOrderParams, OrderIds, RejectOrderParams, UpdateFeesParams, UserData, UserDataField, UserDataValueField };

import { DocumentType } from 'brij_protos_js/gen/brij/storage/v1/common/data_pb';
import { ValidationStatus as ProtoValidationStatus } from 'brij_protos_js/gen/brij/storage/v1/common/validation_data_pb';
import {
  KycStatus as ProtoKycStatus,
} from 'brij_protos_js/gen/brij/storage/v1/common/kyc_pb';

export type OrderIds = { orderId: string; externalId?: "" } | { orderId?: ""; externalId: string };

export type CompleteOnRampOrderParams = OrderIds & { transactionId: string };

export type FailOrderParams = OrderIds & { reason: string };

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

export type RejectOrderParams = { orderId: string; reason: string };

export type DataAccessParams = {
  userPK: string;
  secretKey: string;
  includeValues?: boolean;
};

export type UserDataField = { hash: string };

export type UserDataValueField<T> = { value: T } & UserDataField;

export type UserData = {
  email?: UserDataValueField<string> & { status: ValidationStatus };
  phone?: UserDataValueField<string> & { status: ValidationStatus };
  name?: { firstName: string; lastName: string } & UserDataField;
  citizenship?: UserDataValueField<string>;
  birthDate?: UserDataValueField<Date>;
  documents?: ({ type: DocumentType | string; number: string; countryCode: string } & UserDataField)[];
  bankInfos?: ({ bankName: string; accountNumber: string; bankCode: string; countryCode: string } & UserDataField)[];
  selfie?: UserDataValueField<Uint8Array>;
}

export type ValidationResult = { dataId: string; value: string; status: ValidationStatus };

export enum ValidationStatus {
  Unspecified = "UNSPECIFIED",
  Pending = "PENDING",
  Approved = "APPROVED",
  Rejected = "REJECTED",
  Unverified = "UNVERIFIED",
}

export function toValidationStatus(protoStatus?: ProtoValidationStatus | undefined): ValidationStatus {
  switch (protoStatus) {
    case ProtoValidationStatus.UNSPECIFIED:
      return ValidationStatus.Unspecified;
    case ProtoValidationStatus.PENDING:
      return ValidationStatus.Pending;
    case ProtoValidationStatus.APPROVED:
      return ValidationStatus.Approved;
    case ProtoValidationStatus.REJECTED:
      return ValidationStatus.Rejected;
    default:
      return ValidationStatus.Unspecified;
  }
}

export type UpdateFeesParams = {
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

export enum RampType {
  Unspecified = "RAMP_TYPE_UNSPECIFIED",
  OnRamp = "RAMP_TYPE_ON_RAMP",
  OffRamp = "RAMP_TYPE_OFF_RAMP"
}

export type Order = {
  orderId: string;
  externalId?: string;
  created: string;
  status: string;
  partnerPublicKey: string;
  userPublicKey: string;
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
  userSignature?: Uint8Array;
  partnerSignature?: Uint8Array;
  userWalletAddress?: string;
  walletPublicKey?: string;
};

export enum KycStatus {
  Unspecified = "KYC_STATUS_UNSPECIFIED",
  Pending = "KYC_STATUS_PENDING",
  Approved = "KYC_STATUS_APPROVED",
  Rejected = "KYC_STATUS_REJECTED"
}

export interface KycItem {
  countries: string[];
  status: KycStatus;
  provider: string;
  userPublicKey: string;
  hashes: string[];
  additionalData: Record<string, Uint8Array>;
}

export interface KycStatusDetails {
  status: KycStatus;
  data?: KycItem;
  signature?: string;
}

export function toKycStatus(protoStatus: ProtoKycStatus): KycStatus {
  switch (protoStatus) {
    case ProtoKycStatus.UNSPECIFIED:
      return KycStatus.Unspecified;
    case ProtoKycStatus.PENDING:
      return KycStatus.Pending;
    case ProtoKycStatus.APPROVED:
      return KycStatus.Approved;
    case ProtoKycStatus.REJECTED:
      return KycStatus.Rejected;
    default:
      return KycStatus.Unspecified;
  }
}
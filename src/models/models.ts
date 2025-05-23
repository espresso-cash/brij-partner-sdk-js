import { DocumentType } from 'brij_protos_js/gen/brij/storage/v1/common/data_pb';
import { ValidationStatus as ProtoValidationStatus } from 'brij_protos_js/gen/brij/storage/v1/common/validation_status_pb';

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

export type UserDataField = { dataId: string; hash: string };

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

export function toValidationStatus(protoStatus: ProtoValidationStatus): ValidationStatus {
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

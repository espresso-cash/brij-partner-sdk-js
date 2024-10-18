import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
export declare const protobufPackage = "espressocash.data.v1";
export declare enum DocumentType {
    DOCUMENT_TYPE_UNSPECIFIED = 0,
    DOCUMENT_TYPE_VOTER_ID = 1,
    UNRECOGNIZED = -1
}
export declare function documentTypeFromJSON(object: any): DocumentType;
export declare function documentTypeToJSON(object: DocumentType): string;
export declare enum ValidationStatus {
    VALIDATION_STATUS_UNSPECIFIED = 0,
    VALIDATION_STATUS_PENDING = 1,
    VALIDATION_STATUS_APPROVED = 2,
    VALIDATION_STATUS_REJECTED = 3,
    UNRECOGNIZED = -1
}
export declare function validationStatusFromJSON(object: any): ValidationStatus;
export declare function validationStatusToJSON(object: ValidationStatus): string;
export interface WrappedData {
    email?: string | undefined;
    name?: Name | undefined;
    birthDate?: Date | undefined;
    phone?: string | undefined;
    document?: Document | undefined;
    bankInfo?: BankInfo | undefined;
    selfieImage?: Uint8Array | undefined;
}
export interface Name {
    firstName: string;
    lastName: string;
}
export interface Document {
    type: DocumentType;
    number: string;
    countryCode: string;
}
export interface BankInfo {
    accountNumber: string;
    bankCode: string;
    bankName: string;
}
export interface WrappedValidation {
    hash?: HashValidation | undefined;
    custom?: CustomValidation | undefined;
}
export interface HashValidation {
    hash: string;
    status: ValidationStatus;
}
export interface CustomValidation {
    type: string;
    data: Uint8Array;
}
export declare const WrappedData: MessageFns<WrappedData>;
export declare const Name: MessageFns<Name>;
export declare const Document: MessageFns<Document>;
export declare const BankInfo: MessageFns<BankInfo>;
export declare const WrappedValidation: MessageFns<WrappedValidation>;
export declare const HashValidation: MessageFns<HashValidation>;
export declare const CustomValidation: MessageFns<CustomValidation>;
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export interface MessageFns<T> {
    encode(message: T, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): T;
    fromJSON(object: any): T;
    toJSON(message: T): unknown;
    create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
    fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
export {};

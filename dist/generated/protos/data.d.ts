import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
export declare const protobufPackage = "brij.storage.v1";
export declare enum DataType {
    DATA_TYPE_UNSPECIFIED = 0,
    DATA_TYPE_PHONE = 1,
    DATA_TYPE_EMAIL = 2,
    DATA_TYPE_NAME = 3,
    DATA_TYPE_BIRTH_DATE = 4,
    DATA_TYPE_DOCUMENT = 5,
    DATA_TYPE_BANK_INFO = 6,
    DATA_TYPE_SELFIE_IMAGE = 7,
    UNRECOGNIZED = -1
}
export declare function dataTypeFromJSON(object: any): DataType;
export declare function dataTypeToJSON(object: DataType): string;
export declare enum DocumentType {
    DOCUMENT_TYPE_UNSPECIFIED = 0,
    DOCUMENT_TYPE_VOTER_ID = 1,
    UNRECOGNIZED = -1
}
export declare function documentTypeFromJSON(object: any): DocumentType;
export declare function documentTypeToJSON(object: DocumentType): string;
export interface Name {
    firstName: string;
    lastName: string;
}
export interface BirthDate {
    value: Date | undefined;
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
export interface Email {
    value: string;
}
export interface SelfieImage {
    value: Uint8Array;
}
export interface Phone {
    value: string;
}
export declare const Name: MessageFns<Name>;
export declare const BirthDate: MessageFns<BirthDate>;
export declare const Document: MessageFns<Document>;
export declare const BankInfo: MessageFns<BankInfo>;
export declare const Email: MessageFns<Email>;
export declare const SelfieImage: MessageFns<SelfieImage>;
export declare const Phone: MessageFns<Phone>;
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

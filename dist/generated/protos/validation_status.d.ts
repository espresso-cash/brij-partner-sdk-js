export declare const protobufPackage = "brij.storage.v1";
export declare enum ValidationStatus {
    VALIDATION_STATUS_UNSPECIFIED = 0,
    VALIDATION_STATUS_PENDING = 1,
    VALIDATION_STATUS_APPROVED = 2,
    VALIDATION_STATUS_REJECTED = 3,
    UNRECOGNIZED = -1
}
export declare function validationStatusFromJSON(object: any): ValidationStatus;
export declare function validationStatusToJSON(object: ValidationStatus): string;

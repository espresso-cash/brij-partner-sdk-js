"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XFlowPartnerClient = exports.ValidationStatus = void 0;
const crypto_1 = require("crypto");
const jose_1 = require("jose");
const axios_1 = __importDefault(require("axios"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const tweetnacl_util_1 = __importDefault(require("tweetnacl-util"));
const ed2curve_1 = __importDefault(require("ed2curve"));
const data_1 = require("./generated/protos/data");
const _baseURL = "https://kyc-backend-oxvpvdtvzq-ew.a.run.app";
var ValidationStatus;
(function (ValidationStatus) {
    ValidationStatus["Unspecified"] = "UNSPECIFIED";
    ValidationStatus["Pending"] = "PENDING";
    ValidationStatus["Approved"] = "APPROVED";
    ValidationStatus["Rejected"] = "REJECTED";
    ValidationStatus["Unverified"] = "UNVERIFIED";
})(ValidationStatus || (exports.ValidationStatus = ValidationStatus = {}));
function toValidationStatus(protoStatus) {
    switch (protoStatus) {
        case data_1.ValidationStatus.VALIDATION_STATUS_UNSPECIFIED:
            return ValidationStatus.Unspecified;
        case data_1.ValidationStatus.VALIDATION_STATUS_PENDING:
            return ValidationStatus.Pending;
        case data_1.ValidationStatus.VALIDATION_STATUS_APPROVED:
            return ValidationStatus.Approved;
        case data_1.ValidationStatus.VALIDATION_STATUS_REJECTED:
            return ValidationStatus.Rejected;
        default:
            return ValidationStatus.Unspecified;
    }
}
class XFlowPartnerClient {
    constructor({ authKeyPair, baseUrl }) {
        this.authKeyPair = authKeyPair;
        this.baseUrl = baseUrl || _baseURL;
        this._authPublicKey = "";
        this._token = "";
        this._apiClient = null;
    }
    static async generateKeyPair() {
        const keyPair = tweetnacl_1.default.sign.keyPair();
        return {
            publicKey: bs58_1.default.encode(keyPair.publicKey),
            privateKey: bs58_1.default.encode(keyPair.secretKey),
            secretKey: bs58_1.default.encode(keyPair.secretKey),
            seed: bs58_1.default.encode(keyPair.secretKey.slice(0, 32)),
            getPublicKeyBytes: async () => keyPair.publicKey,
            getPrivateKeyBytes: async () => keyPair.secretKey,
        };
    }
    static async fromSeed(seed) {
        const decoded = bs58_1.default.decode(seed);
        const authKeyPair = tweetnacl_1.default.sign.keyPair.fromSeed(decoded);
        const client = new XFlowPartnerClient({
            authKeyPair: {
                async getPrivateKeyBytes() {
                    return authKeyPair.secretKey;
                },
                async getPublicKeyBytes() {
                    return authKeyPair.publicKey;
                },
            },
        });
        await client.init();
        return client;
    }
    async init() {
        await Promise.all([this.generateAuthToken()]);
    }
    async generateAuthToken() {
        const [publicKeyBytes, privateKeyBytes] = await Promise.all([
            this.authKeyPair.getPublicKeyBytes(),
            this.authKeyPair.getPrivateKeyBytes(),
        ]);
        this._authPublicKey = bs58_1.default.encode(publicKeyBytes);
        const header = { alg: "EdDSA", typ: "JWT" };
        const payload = {
            iss: this._authPublicKey,
            iat: Math.floor(Date.now() / 1000),
            aud: "kyc.espressocash.com",
        };
        const encodedHeader = jose_1.base64url.encode(JSON.stringify(header));
        const encodedPayload = jose_1.base64url.encode(JSON.stringify(payload));
        const dataToSign = `${encodedHeader}.${encodedPayload}`;
        const signature = tweetnacl_1.default.sign.detached(new TextEncoder().encode(dataToSign), privateKeyBytes);
        this._token = `${dataToSign}.${jose_1.base64url.encode(signature)}`;
        this._apiClient = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: { Authorization: `Bearer ${this._token}` },
        });
    }
    async getUserData({ userPK, secretKey }) {
        const response = await this._apiClient.post("/v1/getUserData", {
            userPublicKey: userPK,
        });
        const responseData = response.data;
        const validationMap = new Map();
        const custom = {};
        const userVerifyKey = bs58_1.default.decode(userPK);
        const secret = bs58_1.default.decode(secretKey);
        // Validation results
        for (const encrypted of responseData.validationData) {
            const encryptedData = encrypted.encryptedData;
            const validatorVerifyKey = bs58_1.default.decode(encrypted.validatorPublicKey);
            const signedMessage = tweetnacl_util_1.default.decodeBase64(encryptedData);
            const message = tweetnacl_1.default.sign.open(signedMessage, validatorVerifyKey);
            if (!message) {
                throw new Error(`Invalid signature for key`);
            }
            const decryptedData = await this.decryptData(message, secret);
            const wrappedData = data_1.WrappedValidation.decode(new Uint8Array(decryptedData));
            if (wrappedData.hash) {
                const result = {
                    dataId: encrypted.dataId,
                    value: wrappedData.hash.hash,
                    status: wrappedData.hash.status,
                };
                validationMap.set(result.dataId, result);
            }
            else if (wrappedData.custom) {
                const result = {
                    type: wrappedData.custom.type,
                    value: new TextDecoder().decode(wrappedData.custom.data),
                };
                custom[result.type] = result.value;
            }
        }
        const userData = {
            email: [],
            phone: [],
            name: [],
            birthDate: [],
            document: [],
            bankInfo: [],
            selfie: [],
            custom: custom,
        };
        // User data
        for (const encrypted of responseData.userData) {
            const encryptedData = encrypted.encryptedData;
            const signedMessage = tweetnacl_util_1.default.decodeBase64(encryptedData);
            const message = tweetnacl_1.default.sign.open(signedMessage, userVerifyKey);
            if (!message) {
                throw new Error(`Invalid signature for key`);
            }
            const decryptedData = await this.decryptData(message, secret);
            const wrappedData = data_1.WrappedData.decode(new Uint8Array(decryptedData));
            const dataId = encrypted.id;
            const verificationData = validationMap.get(dataId);
            let status = ValidationStatus.Unspecified;
            if (verificationData) {
                const serializedData = new TextDecoder().decode(data_1.WrappedData.encode(wrappedData).finish());
                const hash = await this.generateHash(serializedData);
                const hashMatching = hash === verificationData.value;
                status = hashMatching ? toValidationStatus(verificationData.status) : ValidationStatus.Unverified;
            }
            const commonFields = { dataId, status };
            if (wrappedData.email) {
                userData.email.push(Object.assign({ value: wrappedData.email }, commonFields));
            }
            else if (wrappedData.name) {
                userData.name.push(Object.assign({ firstName: wrappedData.name.firstName, lastName: wrappedData.name.lastName }, commonFields));
            }
            else if (wrappedData.birthDate) {
                userData.birthDate.push(Object.assign({ value: new Date(wrappedData.birthDate) }, commonFields));
            }
            else if (wrappedData.phone) {
                userData.phone.push(Object.assign({ value: wrappedData.phone }, commonFields));
            }
            else if (wrappedData.document) {
                userData.document.push(Object.assign({ type: (0, data_1.documentTypeToJSON)(wrappedData.document.type), number: wrappedData.document.number, countryCode: wrappedData.document.countryCode }, commonFields));
            }
            else if (wrappedData.bankInfo) {
                userData.bankInfo.push(Object.assign({ bankName: wrappedData.bankInfo.bankName, accountNumber: wrappedData.bankInfo.accountNumber, bankCode: wrappedData.bankInfo.bankCode }, commonFields));
            }
            else if (wrappedData.selfieImage) {
                userData.selfie.push(Object.assign({ value: wrappedData.selfieImage }, commonFields));
            }
        }
        return userData;
    }
    async getOrder({ externalId, orderId }) {
        const response = await this._apiClient.post("/v1/getOrder", {
            orderId: orderId,
            externalId: externalId,
        });
        return response.data;
    }
    async getPartnerOrders() {
        const response = await this._apiClient.post("/v1/getPartnerOrders");
        return response.data;
    }
    async acceptOnRampOrder({ orderId, bankName, bankAccount, externalId }) {
        await this._apiClient.post("/v1/acceptOrder", {
            orderId: orderId,
            bankName: bankName,
            bankAccount: bankAccount,
            externalId: externalId,
        });
    }
    async completeOnRampOrder({ orderId, transactionId, externalId }) {
        await this._apiClient.post("/v1/completeOrder", {
            orderId: orderId,
            transactionId: transactionId,
            externalId: externalId,
        });
    }
    async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }) {
        await this._apiClient.post("/v1/acceptOrder", {
            orderId: orderId,
            cryptoWalletAddress: cryptoWalletAddress,
            externalId: externalId,
        });
    }
    async completeOffRampOrder({ orderId, externalId }) {
        await this._apiClient.post("/v1/completeOrder", {
            orderId: orderId,
            externalId: externalId,
        });
    }
    async failOrder({ orderId, reason, externalId }) {
        await this._apiClient.post("/v1/failOrder", {
            orderId: orderId,
            reason: reason,
            externalId: externalId,
        });
    }
    async rejectOrder({ orderId, reason }) {
        await this._apiClient.post("/v1/rejectOrder", {
            orderId: orderId,
            reason: reason,
        });
    }
    async getUserInfo(publicKey) {
        const response = await this._apiClient.post("/v1/getInfo", {
            publicKey: publicKey,
        });
        return response.data;
    }
    async getUserSecretKey(publicKey) {
        const info = await this.getUserInfo(publicKey);
        const encryptedData = tweetnacl_util_1.default.decodeBase64(info.encryptedSecretKey);
        const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
        const x25519PrivateKey = ed2curve_1.default.convertSecretKey(privateKeyBytes);
        const userPk = bs58_1.default.decode(publicKey);
        const x25519PublicKey = ed2curve_1.default.convertPublicKey(userPk);
        const nonce = encryptedData.slice(0, tweetnacl_1.default.box.nonceLength);
        const ciphertext = encryptedData.slice(tweetnacl_1.default.box.nonceLength);
        const decryptedSecretKey = tweetnacl_1.default.box.open(ciphertext, nonce, x25519PublicKey, x25519PrivateKey);
        if (!decryptedSecretKey) {
            throw new Error("Decryption failed");
        }
        return bs58_1.default.encode(decryptedSecretKey);
    }
    async decryptData(encryptedMessage, key) {
        const nonce = encryptedMessage.slice(0, tweetnacl_1.default.secretbox.nonceLength);
        const ciphertext = encryptedMessage.slice(tweetnacl_1.default.secretbox.nonceLength);
        const decrypted = tweetnacl_1.default.secretbox.open(ciphertext, nonce, key);
        if (!decrypted) {
            throw new Error("Unable to decrypt data");
        }
        return decrypted;
    }
    async generateHash(value) {
        return (0, crypto_1.createHash)("sha256").update(value).digest("hex");
    }
}
exports.XFlowPartnerClient = XFlowPartnerClient;
//# sourceMappingURL=index.js.map
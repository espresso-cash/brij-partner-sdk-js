import { createHash } from 'crypto';
import { base64url } from 'jose';
import axios, { AxiosInstance } from 'axios';
import nacl from 'tweetnacl';
import base58 from 'bs58';
import naclUtil from 'tweetnacl-util';
import ed2curve from 'ed2curve';
import { WrappedData, WrappedValidation } from './generated/protos/data';

const _baseURL = 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app';

interface AuthKeyPair {
    getPrivateKeyBytes(): Promise<Uint8Array>;

    getPublicKeyBytes(): Promise<Uint8Array>;
}

interface XFlowPartnerClientOptions {
    authKeyPair: AuthKeyPair;
    baseUrl?: string;
}

export type OrderIds = { orderId: string, externalId?: '' } | { orderId?: '', externalId: string };

export type CompleteOnRampOrderParams = OrderIds & { transactionId: string };

export type FailOrderParams = OrderIds & { reason: string };

export type AcceptOnRampOrderParams = {
    orderId: string,
    bankName: string,
    bankAccount: string,
    externalId?: string,
};

export type AcceptOffRampOrderParams = {
    orderId: string,
    cryptoWalletAddress: string,
    externalId?: string,
};

export type RejectOrderParams = { orderId: string, reason: string };

export type DataAccessParams = { userPK: string, secretKey: string };

interface UserProfile {
    email: Array<{ value: string; dataId: string; verified: boolean }>;
    phone: Array<{ value: string; dataId: string; verified: boolean }>;
    name: Array<{ firstName: string; lastName: string; dataId: string; verified: boolean }>;
    birthDate: Array<{ value: Date; dataId: string; verified: boolean }>;
    document: Array<{ type: string; number: string; dataId: string; verified: boolean }>;
    bankInfo: Array<{ bankName: string; accountNumber: string; bankCode: string; dataId: string; verified: boolean }>;
    selfie: Array<{ value: Uint8Array; dataId: string; verified: boolean }>;
    custom: Record<string, string>;
}

interface ValidationResult {
    dataId: string;
    value: string;
}

interface CustomValidationResult {
    type: string;
    value: string;
}

class XFlowPartnerClient {
    private authKeyPair: AuthKeyPair;
    private readonly baseUrl: string;
    private _authPublicKey: string;
    private _token: string;
    private _apiClient: AxiosInstance | null;

    private constructor({ authKeyPair, baseUrl }: XFlowPartnerClientOptions) {
        this.authKeyPair = authKeyPair;
        this.baseUrl = baseUrl || _baseURL;
        this._authPublicKey = '';
        this._token = '';
        this._apiClient = null;
    }

    static async generateKeyPair() {
        const keyPair = nacl.sign.keyPair();
        return {
            publicKey: base58.encode(keyPair.publicKey),
            privateKey: base58.encode(keyPair.secretKey),
            secretKey: base58.encode(keyPair.secretKey),
            seed: base58.encode(keyPair.secretKey.slice(0, 32)),
            getPublicKeyBytes: async () => keyPair.publicKey,
            getPrivateKeyBytes: async () => keyPair.secretKey
        };
    }

    static async fromSeed(seed: string) {
        const decoded = base58.decode(seed);
        const authKeyPair = nacl.sign.keyPair.fromSeed(decoded);

        const client = new XFlowPartnerClient({
            authKeyPair: {
                async getPrivateKeyBytes() {
                    return authKeyPair.secretKey;
                },
                async getPublicKeyBytes() {
                    return authKeyPair.publicKey;
                }
            },
        });

        await client.init();

        return client;
    }

    private async init() {
        await Promise.all([
            this.generateAuthToken(),
        ]);
    }

    private async generateAuthToken() {
        const [publicKeyBytes, privateKeyBytes] = await Promise.all([
            this.authKeyPair.getPublicKeyBytes(),
            this.authKeyPair.getPrivateKeyBytes()
        ]);

        this._authPublicKey = base58.encode(publicKeyBytes);

        const header = { alg: 'EdDSA', typ: 'JWT' };
        const payload = {
            iss: this._authPublicKey,
            iat: Math.floor(Date.now() / 1000),
            'aud': 'kyc.espressocash.com'
        };

        const encodedHeader = base64url.encode(JSON.stringify(header));
        const encodedPayload = base64url.encode(JSON.stringify(payload));
        const dataToSign = `${encodedHeader}.${encodedPayload}`;

        const signature = nacl.sign.detached(
            new TextEncoder().encode(dataToSign),
            privateKeyBytes
        );

        this._token = `${dataToSign}.${base64url.encode(signature)}`;

        this._apiClient = axios.create({
            baseURL: this.baseUrl,
            headers: { 'Authorization': `Bearer ${this._token}` }
        });
    }

    async getData({ userPK, secretKey }: DataAccessParams): Promise<UserProfile> {
        const response = await this._apiClient!.post('/v1/getUserData', { userPublicKey: userPK });
        const responseData = response.data;

        const validationMap = new Map<string, ValidationResult>();
        const custom: Record<string, string> = {};

        const userVerifyKey = base58.decode(userPK);
        const secret = base58.decode(secretKey);

        // Validation results
        for (const encrypted of responseData.validationData) {
            const encryptedData = encrypted.encryptedData;
            const validatorVerifyKey = base58.decode(encrypted.validatorPublicKey);

            const signedMessage = naclUtil.decodeBase64(encryptedData);
            const message = nacl.sign.open(signedMessage, validatorVerifyKey);

            if (!message) {
                throw new Error(`Invalid signature for key`);
            }
            const decryptedData = await this.decryptData(message, secret);
            const wrappedData = WrappedValidation.decode(new Uint8Array(decryptedData));

            if (wrappedData.hash) {
                const result: ValidationResult = {
                    dataId: encrypted.dataId,
                    value: wrappedData.hash,
                };
                validationMap.set(result.dataId, result);
            } else if (wrappedData.custom) {
                const result: CustomValidationResult = {
                    type: wrappedData.custom.type,
                    value: new TextDecoder().decode(wrappedData.custom.data),
                };
                custom[result.type] = result.value;
            }
        }

        const profile: UserProfile = {
            email: [],
            phone: [],
            name: [],
            birthDate: [],
            document: [],
            bankInfo: [],
            selfie: [],
            custom,
        };

        // User data
        for (const encrypted of responseData.userData) {
            const encryptedData = encrypted.encryptedData;

            const signedMessage = naclUtil.decodeBase64(encryptedData);
            const message = nacl.sign.open(signedMessage, userVerifyKey);

            if (!message) {
                throw new Error(`Invalid signature for key`);
            }
            const decryptedData = await this.decryptData(message, secret);
            const wrappedData = WrappedData.decode(new Uint8Array(decryptedData));

            const dataId = encrypted.id;
            const verificationData = validationMap.get(dataId);

            let verified = false;
            if (verificationData) {
                const serializedData = naclUtil.encodeBase64(WrappedData.encode(wrappedData).finish());
                const hash = await this.generateHash(serializedData);
                verified = hash === verificationData.value;
            }

            if (wrappedData.email) {
                profile.email.push({
                    value: wrappedData.email,
                    dataId,
                    verified,
                });
            } else if (wrappedData.name) {
                profile.name.push({
                    firstName: wrappedData.name.firstName,
                    lastName: wrappedData.name.lastName,
                    dataId,
                    verified,
                });
            } else if (wrappedData.birthDate) {
                profile.birthDate.push({
                    value: new Date(wrappedData.birthDate),
                    dataId,
                    verified,
                });
            } else if (wrappedData.phone) {
                profile.phone.push({
                    value: wrappedData.phone,
                    dataId,
                    verified,
                });
            } else if (wrappedData.document) {
                profile.document.push({
                    // Todo
                    type: '',
                    //type: this.idTypeToString(wrappedData.document.type),
                    number: wrappedData.document.number,
                    dataId,
                    verified,
                });
            } else if (wrappedData.bankInfo) {
                profile.bankInfo.push({
                    bankName: wrappedData.bankInfo.bankName,
                    accountNumber: wrappedData.bankInfo.accountNumber,
                    bankCode: wrappedData.bankInfo.bankCode,
                    dataId,
                    verified,
                });
            } else if (wrappedData.selfieImage) {
                profile.selfie.push({
                    value: wrappedData.selfieImage,
                    dataId,
                    verified,
                });
            }
        }

        console.log(profile);
        return profile;
    }

    async getOrder({ externalId, orderId }: OrderIds) {
        const response = await this._apiClient!.post('/v1/getOrder', {
            orderId: orderId,
            externalId: externalId,
        });

        return response.data;
    }

    async getPartnerOrders() {
        const response = await this._apiClient!.post('/v1/getPartnerOrders');

        return response.data;
    }

    async acceptOnRampOrder({ orderId, bankName, bankAccount, externalId }: AcceptOnRampOrderParams) {
        await this._apiClient!.post('/v1/acceptOrder', {
            orderId: orderId,
            bankName: bankName,
            bankAccount: bankAccount,
            externalId: externalId,
        });
    }

    async completeOnRampOrder({ orderId, transactionId, externalId }: CompleteOnRampOrderParams) {
        await this._apiClient!.post('/v1/completeOrder', {
            orderId: orderId,
            transactionId: transactionId,
            externalId: externalId,
        });
    }

    async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams) {
        await this._apiClient!.post('/v1/acceptOrder', {
            orderId: orderId,
            cryptoWalletAddress: cryptoWalletAddress,
            externalId: externalId,
        });
    }

    async completeOffRampOrder({ orderId, externalId }: OrderIds) {
        await this._apiClient!.post('/v1/completeOrder', {
            orderId: orderId,
            externalId: externalId,
        });
    }

    async failOrder({ orderId, reason, externalId }: FailOrderParams) {
        await this._apiClient!.post('/v1/failOrder', {
            orderId: orderId,
            reason: reason,
            externalId: externalId,
        });
    }

    async rejectOrder({ orderId, reason }: RejectOrderParams) {
        await this._apiClient!.post('/v1/rejectOrder', {
            orderId: orderId,
            reason: reason
        });
    }

    async getUserInfo(publicKey: string) {
        const response = await this._apiClient!.post('/v1/getInfo', {
            publicKey: publicKey
        });

        return response.data;
    }

    async getUserSecretKey(publicKey: string) {
        const info = await this.getUserInfo(publicKey);

        const encryptedData = naclUtil.decodeBase64(info.encryptedSecretKey);

        const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
        const x25519PrivateKey = ed2curve.convertSecretKey(privateKeyBytes);

        const userPk = base58.decode(publicKey);
        const x25519PublicKey = ed2curve.convertPublicKey(userPk)!;

        const nonce = encryptedData.slice(0, nacl.box.nonceLength);
        const ciphertext = encryptedData.slice(nacl.box.nonceLength);

        const decryptedSecretKey = nacl.box.open(
            ciphertext,
            nonce,
            x25519PublicKey,
            x25519PrivateKey
        );

        if (!decryptedSecretKey) {
            throw new Error('Decryption failed');
        }

        return base58.encode(decryptedSecretKey);
    }

    private async decryptData(encryptedMessage: Uint8Array, key: Uint8Array) {
        const nonce = encryptedMessage.slice(0, nacl.secretbox.nonceLength);
        const ciphertext = encryptedMessage.slice(nacl.secretbox.nonceLength);

        const decrypted = nacl.secretbox.open(ciphertext, nonce, key);

        if (!decrypted) {
            throw new Error('Unable to decrypt data');
        }

        return decrypted;
    }

    private async generateHash(value: string) {
        return createHash('sha256').update(value).digest('hex');
    }
}

export { XFlowPartnerClient };

import { createHash } from 'crypto';
import { base64url } from 'jose';
import axios from 'axios';
import nacl from 'tweetnacl';
import base58 from 'bs58';
import naclUtil from 'tweetnacl-util';
import ed2curve from 'ed2curve';
import { WrappedData, WrappedValidation, documentTypeToJSON } from './generated/protos/data';
const _baseURL = 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app';
class XFlowPartnerClient {
    authKeyPair;
    baseUrl;
    _authPublicKey;
    _token;
    _apiClient;
    constructor({ authKeyPair, baseUrl }) {
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
    static async fromSeed(seed) {
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
    async init() {
        await Promise.all([
            this.generateAuthToken(),
        ]);
    }
    async generateAuthToken() {
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
        const signature = nacl.sign.detached(new TextEncoder().encode(dataToSign), privateKeyBytes);
        this._token = `${dataToSign}.${base64url.encode(signature)}`;
        this._apiClient = axios.create({
            baseURL: this.baseUrl,
            headers: { 'Authorization': `Bearer ${this._token}` }
        });
    }
    async getData({ userPK, secretKey }) {
        const response = await this._apiClient.post('/v1/getUserData', { userPublicKey: userPK });
        const responseData = response.data;
        const validationMap = new Map();
        const custom = {};
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
                const result = {
                    dataId: encrypted.dataId,
                    value: wrappedData.hash,
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
        const profile = {
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
            }
            else if (wrappedData.name) {
                profile.name.push({
                    firstName: wrappedData.name.firstName,
                    lastName: wrappedData.name.lastName,
                    dataId,
                    verified,
                });
            }
            else if (wrappedData.birthDate) {
                profile.birthDate.push({
                    value: new Date(wrappedData.birthDate),
                    dataId,
                    verified,
                });
            }
            else if (wrappedData.phone) {
                profile.phone.push({
                    value: wrappedData.phone,
                    dataId,
                    verified,
                });
            }
            else if (wrappedData.document) {
                profile.document.push({
                    type: documentTypeToJSON(wrappedData.document.type),
                    number: wrappedData.document.number,
                    dataId,
                    verified,
                });
            }
            else if (wrappedData.bankInfo) {
                profile.bankInfo.push({
                    bankName: wrappedData.bankInfo.bankName,
                    accountNumber: wrappedData.bankInfo.accountNumber,
                    bankCode: wrappedData.bankInfo.bankCode,
                    dataId,
                    verified,
                });
            }
            else if (wrappedData.selfieImage) {
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
    async getOrder({ externalId, orderId }) {
        const response = await this._apiClient.post('/v1/getOrder', {
            orderId: orderId,
            externalId: externalId,
        });
        return response.data;
    }
    async getPartnerOrders() {
        const response = await this._apiClient.post('/v1/getPartnerOrders');
        return response.data;
    }
    async acceptOnRampOrder({ orderId, bankName, bankAccount, externalId }) {
        await this._apiClient.post('/v1/acceptOrder', {
            orderId: orderId,
            bankName: bankName,
            bankAccount: bankAccount,
            externalId: externalId,
        });
    }
    async completeOnRampOrder({ orderId, transactionId, externalId }) {
        await this._apiClient.post('/v1/completeOrder', {
            orderId: orderId,
            transactionId: transactionId,
            externalId: externalId,
        });
    }
    async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }) {
        await this._apiClient.post('/v1/acceptOrder', {
            orderId: orderId,
            cryptoWalletAddress: cryptoWalletAddress,
            externalId: externalId,
        });
    }
    async completeOffRampOrder({ orderId, externalId }) {
        await this._apiClient.post('/v1/completeOrder', {
            orderId: orderId,
            externalId: externalId,
        });
    }
    async failOrder({ orderId, reason, externalId }) {
        await this._apiClient.post('/v1/failOrder', {
            orderId: orderId,
            reason: reason,
            externalId: externalId,
        });
    }
    async rejectOrder({ orderId, reason }) {
        await this._apiClient.post('/v1/rejectOrder', {
            orderId: orderId,
            reason: reason
        });
    }
    async getUserInfo(publicKey) {
        const response = await this._apiClient.post('/v1/getInfo', {
            publicKey: publicKey
        });
        return response.data;
    }
    async getUserSecretKey(publicKey) {
        const info = await this.getUserInfo(publicKey);
        const encryptedData = naclUtil.decodeBase64(info.encryptedSecretKey);
        const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
        const x25519PrivateKey = ed2curve.convertSecretKey(privateKeyBytes);
        const userPk = base58.decode(publicKey);
        const x25519PublicKey = ed2curve.convertPublicKey(userPk);
        const nonce = encryptedData.slice(0, nacl.box.nonceLength);
        const ciphertext = encryptedData.slice(nacl.box.nonceLength);
        const decryptedSecretKey = nacl.box.open(ciphertext, nonce, x25519PublicKey, x25519PrivateKey);
        if (!decryptedSecretKey) {
            throw new Error('Decryption failed');
        }
        return base58.encode(decryptedSecretKey);
    }
    async decryptData(encryptedMessage, key) {
        const nonce = encryptedMessage.slice(0, nacl.secretbox.nonceLength);
        const ciphertext = encryptedMessage.slice(nacl.secretbox.nonceLength);
        const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
        if (!decrypted) {
            throw new Error('Unable to decrypt data');
        }
        return decrypted;
    }
    async generateHash(value) {
        return createHash('sha256').update(value).digest('hex');
    }
}
export { XFlowPartnerClient };

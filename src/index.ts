import {createHash} from 'crypto';
import {base64url} from 'jose';
import axios, {AxiosInstance} from 'axios';
import nacl from 'tweetnacl';
import base58 from 'bs58';
import naclUtil from 'tweetnacl-util';
import ed2curve from 'ed2curve';

const _baseURL = 'https://kyc-backend-oxvpvdtvzq-ew.a.run.app';

interface AuthKeyPair {
    getPrivateKeyBytes(): Promise<Uint8Array>;

    getPublicKeyBytes(): Promise<Uint8Array>;
}

interface XFlowPartnerClientOptions {
    authKeyPair: AuthKeyPair;
    baseUrl?: string;
}

class XFlowPartnerClient {
    private authKeyPair: AuthKeyPair;
    private readonly baseUrl: string;
    private _authPublicKey: string;
    private _token: string;
    private _apiClient: AxiosInstance | null;

    private constructor({authKeyPair, baseUrl}: XFlowPartnerClientOptions) {
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
            this._generateAuthToken(),
        ]);
    }

    private async _generateAuthToken() {
        const [publicKeyBytes, privateKeyBytes] = await Promise.all([
            this.authKeyPair.getPublicKeyBytes(),
            this.authKeyPair.getPrivateKeyBytes()
        ]);

        this._authPublicKey = base58.encode(publicKeyBytes);

        const header = {alg: 'EdDSA', typ: 'JWT'};
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
            headers: {'Authorization': `Bearer ${this._token}`}
        });
    }

    private async _decryptData(encryptedMessage: Uint8Array, key: Uint8Array) {
        const nonce = encryptedMessage.slice(0, nacl.secretbox.nonceLength);
        const ciphertext = encryptedMessage.slice(nacl.secretbox.nonceLength);

        const decrypted = nacl.secretbox.open(ciphertext, nonce, key);

        if (!decrypted) {
            throw new Error('Unable to decrypt data');
        }

        return decrypted;
    }

    async getData({userPK, secretKey}: { userPK: string, secretKey: string }) {
        const response = await this._apiClient!.post('/v1/getData', {publicKey: userPK});
        const responseData = response.data.data as [string, string];

        const verifyKey = base58.decode(userPK);
        const secret = base58.decode(secretKey);

        const data = await Promise.all(
            Object.entries(responseData).map(async ([key, value]) => {
                if (!value) return [key, ''];

                const signedMessage = naclUtil.decodeBase64(value);
                const message = nacl.sign.open(signedMessage, verifyKey);

                if (!message) {
                    throw new Error(`Invalid signature for key: ${key}`);
                }

                const decrypted = await this._decryptData(message, secret);
                return [key, ['photoSelfie', 'photoIdCard'].includes(key) ? decrypted : new TextDecoder().decode(decrypted)];
            })
        );

        return Object.fromEntries(data);
    }

    async getValidationResult({key, secretKey, userPK}: { key: string, secretKey: string, userPK: string }) {
        const response = await this._apiClient!.post('/v1/getValidationResult', {
            userPublicKey: userPK,
            validatorPublicKey: this._authPublicKey,
        });
        const data = response.data['data'][key];

        if (!data) return null;

        const secret = base58.decode(secretKey);

        const signedMessage = naclUtil.decodeBase64(data);
        const message = signedMessage.slice(nacl.sign.signatureLength);

        const decrypted = await this._decryptData(message, secret);
        return Buffer.from(decrypted).toString('hex');
    }

    async getOrder(orderId: string) {
        const response = await this._apiClient!.post('/v1/getOrder', {
            orderId: orderId,
        });

        return response.data;
    }

    async getPartnerOrders() {
        const response = await this._apiClient!.post('/v1/getPartnerOrders');

        return response.data;
    }

    async acceptOnRampOrder({orderId, bankName, bankAccount}: {
        orderId: string,
        bankName: string,
        bankAccount: string
    }) {
        await this._apiClient!.post('/v1/acceptOrder', {
            orderId: orderId,
            bankName: bankName,
            bankAccount: bankAccount,
        });
    }

    async completeOnRampOrder({orderId, transactionId}: { orderId: string, transactionId: string }) {
        await this._apiClient!.post('/v1/completeOrder', {
            orderId: orderId,
            transactionId: transactionId,
        });
    }

    async acceptOffRampOrder({orderId, cryptoWalletAddress}: {
        orderId: string,
        cryptoWalletAddress: string,
    }) {
        await this._apiClient!.post('/v1/acceptOrder', {
            orderId: orderId,
            cryptoWalletAddress: cryptoWalletAddress,
        });
    }

    async completeOffRampOrder({orderId}: { orderId: string }) {
        await this._apiClient!.post('/v1/completeOrder', {
            orderId: orderId,
        });
    }

    async failOrder({orderId, reason}: { orderId: string, reason: string }) {
        await this._apiClient!.post('/v1/failOrder', {
            orderId: orderId,
            reason: reason
        });
    }

    async rejectOrder({orderId, reason}: { orderId: string, reason: string }) {
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

    async hash(value: string) {
        return createHash('sha256').update(value).digest('hex');
    }

    async getEmail({userPK, secretKey}: { userPK: string, secretKey: string }) {
        const [userData, validationResult] = await Promise.all([
            this.getData({userPK, secretKey}),
            this.getValidationResult({key: 'email', secretKey, userPK})
        ]);

        const email = userData.email;
        const emailHash = await this.hash(email);
        const verified = emailHash === validationResult;

        return {
            value: email,
            verified: verified
        };
    }

    async getPhone({userPK, secretKey}: { userPK: string, secretKey: string }) {
        const [userData, validationResult] = await Promise.all([
            this.getData({userPK, secretKey}),
            this.getValidationResult({key: 'phone', secretKey, userPK})
        ]);

        const phone = userData.phone;
        const phoneHash = await this.hash(phone);
        const verified = phoneHash === validationResult;

        return {
            value: phone,
            verified: verified
        };
    }
}

export {XFlowPartnerClient};

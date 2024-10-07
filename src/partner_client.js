import { createHash } from 'crypto';
import { base64url } from 'jose';
import axios from 'axios';
import nacl from 'tweetnacl';
import base58 from 'bs58';
import naclUtil from 'tweetnacl-util';
import ed2curve from 'ed2curve';

class KycPartnerClient {
    constructor({ authKeyPair, baseUrl }) {
        this.authKeyPair = authKeyPair;
        this.baseUrl = baseUrl;
        this._authPublicKey = '';
        this._token = '';
        this._apiClient = null;
        this._signingKey = null;
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

    async init() {
        await Promise.all([
            this._generateAuthToken(),
            this._initializeEncryption()
        ]);
    }

    async _initializeEncryption() {
        const authPrivateKey = await this.authKeyPair.getPrivateKeyBytes();
        this._signingKey = nacl.sign.keyPair.fromSeed(authPrivateKey.slice(0, 32));
    }


    async _generateAuthToken() {
        const [publicKeyBytes, privateKeyBytes] = await Promise.all([
            this.authKeyPair.getPublicKeyBytes(),
            this.authKeyPair.getPrivateKeyBytes()
        ]);

        this._authPublicKey = base58.encode(publicKeyBytes);

        const header = { alg: 'EdDSA', typ: 'JWT' };
        const payload = {
            iss: this._authPublicKey,
            iat: Math.floor(Date.now() / 1000)
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

    async _decryptData(encryptedMessage, key) {
        const nonce = encryptedMessage.slice(0, nacl.secretbox.nonceLength);
        const ciphertext = encryptedMessage.slice(nacl.secretbox.nonceLength);

        const decrypted = nacl.secretbox.open(ciphertext, nonce, key);

        if (!decrypted) {
            throw new Error('Unable to decrypt data');
        }

        return decrypted;
    }


    async _encryptAndSignData(data, key) {
        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
        const ciphertext = nacl.secretbox(naclUtil.decodeUTF8(data), nonce, key);
        const encryptedData = new Uint8Array([...nonce, ...ciphertext]);

        const signature = nacl.sign(encryptedData, this._signingKey.secretKey);

        return naclUtil.encodeBase64(signature);
    }

    async getData({ userPK, secretKey }) {
        const response = await this._apiClient.post('/v1/getData', { publicKey: userPK });
        const responseData = response.data.data;

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

    async setValidationResult({ value, userPK, secretKey }) {
        const secret = base58.decode(secretKey);
        const encryptedData = {};

        await Promise.all(
            Object.entries(value).map(async ([key, val]) => {
                if (val != null) {
                    encryptedData[key] = await this._encryptAndSignData(val, secret);
                }
            })
        );

        await this._apiClient.post('/v1/setValidationResult', {
            userPublicKey: userPK,
            data: encryptedData
        });
    }

    async getValidationResult({ key, secretKey, userPK }) {
        const response = await this._apiClient.post('/v1/getValidationResult', {
            userPublicKey: userPK,
            validatorPublicKey: this._authPublicKey,
        });
        const data = response.data['data'][key];

        if (!data) return null;

        const secret = base58.decode(secretKey);

        const signedMessage = naclUtil.decodeBase64(data);
        const message = signedMessage.slice(nacl.sign.signatureLength);

        const decrypted = await this._decryptData(message, secret);

        return new TextDecoder().decode(decrypted);
    }

    async getOrder(orderId) {
        const response = await this._apiClient.post('/v1/getOrder', {
            orderId: orderId,
        });

        return response.data;
    }

    async getPartnerOrders() {
        const response = await this._apiClient.post('/v1/getPartnerOrders',);

        return response.data;
    }

    async acceptOrder(orderId) {
        await this._apiClient.post('/v1/acceptOrder', {
            orderId: orderId,
        });
    }

    async completeOrder(orderId) {
        await this._apiClient.post('/v1/completeOrder', {
            orderId: orderId,
        });
    }

    async failOrder(orderId, reason) {
        await this._apiClient.post('/v1/failOrder', {
            orderId: orderId,
            reason: reason
        });
    }

    async rejectOrder(orderId, reason) {
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

    async validateField(value) {
        const [updatedEmail, updatedPhone] = await Promise.all([
            value.email != null ? this._hash(value.email) : null,
            value.phone != null ? this._hash(value.phone) : null
        ]);

        const updatedValue = { ...value, email: updatedEmail, phone: updatedPhone };
        await this.setValidationResult({ value: updatedValue });
    }

    async _hash(value) {
        return createHash('blake2b512').update(value).digest('hex');
    }
}

export { KycPartnerClient };
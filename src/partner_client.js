import { createHash } from 'crypto';
import { SignJWT, importJWK } from 'jose';
import axios from 'axios';
import nacl from 'tweetnacl';
import base58 from 'bs58';
import { Buffer } from 'buffer';
import naclUtil from 'tweetnacl-util';

class KycPartnerClient {
    constructor({ authKeyPair, baseUrl }) {
        this.authKeyPair = authKeyPair;
        this.baseUrl = baseUrl;
        this._authPublicKey = '';
        this._token = '';
        this._apiClient = null;
        this._signingKey = null;
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

        const privateKeyJWK = {
            kty: 'OKP',
            crv: 'Ed25519',
            x: Buffer.from(publicKeyBytes).toString('base64url'),
            d: Buffer.from(privateKeyBytes.slice(0, 32)).toString('base64url'),
        };

        let privateKey = await importJWK(privateKeyJWK, 'EdDSA');
        this._token = await new SignJWT({})
            .setIssuer(base58.encode(publicKeyBytes))
            .setProtectedHeader({ alg: 'EdDSA' })
            .sign(privateKey);

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

    acceptOrder = async (orderId) => {
        await this._apiClient.post('/v1/acceptOrder', {
            orderId: orderId,
        });
    }

    completeOrder = async (orderId) => {
        await this._apiClient.post('/v1/completeOrder', {
            orderId: orderId,
        });
    }

    failOrder = async (orderId) => {
        await this._apiClient.post('/v1/failOrder', {
            orderId: orderId,
        });
    }

    rejectOrder = async (orderId) => {
        await this._apiClient.post('/v1/rejectOrder', {
            orderId: orderId,
        });
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
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import base58 from 'bs58';
import base64 from 'base-64';

const { encode: encodeBase58, decode: decodeBase58 } = base58;
const { encode: base64encode, decode: base64decode } = base64;

class KycPartnerClient {
      constructor({ authKeyPair, baseUrl }) {
            this.authKeyPair = authKeyPair;
            this.baseUrl = baseUrl;

            this._authPublicKey = '';
            this._token = '';
            this._apiClient = null;
            this._secretBox = null;
            this._signingKey = null;
      }

      async init({ partnerToken, secretKey }) {
            await this._generateAuthToken(partnerToken);
            await this._initializeEncryption(secretKey);
      }

      async _initializeEncryption(secretKey) {
            console.log("Secret Key:", secretKey);
            const secretKeyBytes = decodeBase58(secretKey);
            this._secretBox = new SecretBox(Uint8Array.from(secretKeyBytes));
            const authPrivateKey = await this.authKeyPair.getPrivateKeyBytes();

            console.log("Auth Private Key Length:", authPrivateKey.length);
            const authPublicKeyBytes = decodeBase58(this._authPublicKey);
            console.log("Auth Public Key Length:", authPublicKeyBytes.length);

            const seed = authPrivateKey.slice(0, 32);
            console.log("Seed Length:", seed.length);

            this._signingKey = nacl.sign.keyPair.fromSeed(seed);
      }

      async _generateAuthToken(partnerToken) {
            this._authPublicKey = encodeBase58(await this.authKeyPair.getPublicKeyBytes());

            console.log("Public Key (Base58 Encoded):", this._authPublicKey);

            // Construct the JWT payload and sign it using EdDSA
            const partnerTokenData = {
                  delegated: partnerToken,
                  issuer: this._authPublicKey
            };

            const privateKeyBytes = Uint8Array.from([
                  ...await this.authKeyPair.getPrivateKeyBytes(),
                  ...decodeBase58(this._authPublicKey)
            ]);

            // Sign the token
            this._token = jwt.sign(partnerTokenData, Buffer.from(privateKeyBytes), {
                  // algorithm: 'ES256',
            });


            const instance = axios.create({
                  baseURL: this.baseUrl,
            });
            instance.interceptors.request.use(config => {
                  config.headers['Authorization'] = `Bearer ${this._token}`;
                  return config;
            });

            this._apiClient = instance;
      }

      async getData({ userPK, secretKey }) {
            const response= await this._apiClient.post('/v1/getData');
            const responseData = response.data;

            const verifyKey = nacl.sign.keyPair.fromSeed(decodeBase58(userPK)).publicKey;
            const box = new SecretBox(Uint8Array.from(decodeBase58(secretKey)));

            const data = await Promise.all(
                  Object.entries(responseData).map(async ([key, value]) => {
                        const signedDataRaw = value;
                        if (!signedDataRaw) return [key, ''];

                        const signedMessage = nacl.sign.open(
                              base64decode(signedDataRaw),
                              verifyKey
                        );

                        if (!signedMessage) {
                              throw new Error(`Invalid signature for key: ${key}`);
                        }

                        const encryptedData = base64encode(signedMessage);
                        const decrypted = box.decrypt(new TextDecoder().decode(base64decode(encryptedData)));

                        return [key, ['photoSelfie', 'photoIdCard'].includes(key) ? decrypted : new TextDecoder().decode(decrypted)];
                  })
            );

            return Object.fromEntries(data);
      }

      async setValidationResult({ value }) {
            const encryptedValue = value.encryptAndSign(this._encryptAndSign.bind(this));

            await this._apiClient.post('/v1/setValidationResult', { data: encryptedValue });
      }

      async getValidationResult({ key, validatorPK, secretKey }) {
            const response = await this._apiClient.post('/v1/getValidationResult', {
                  publicKey: validatorPK,
            });
            const data = response.data[key];

            if (!data) return null;

            const box = new SecretBox(Uint8Array.from(decodeBase58(secretKey)));
            const signedMessage = nacl.sign.open(base64decode(data));
            const encryptedData = base64encode(signedMessage);
            const decrypted = box.decrypt(new TextDecoder().decode(base64decode(encryptedData)));

            return new TextDecoder().decode(decrypted);
      }

      async validateField(value) {
            const updatedEmail = value.email != null ? await this._hash(value.email) : null;
            const updatedPhone = value.phone != null ? await this._hash(value.phone) : null;

            const updatedValue = Object.assign({}, value, {
                  email: updatedEmail,
                  phone: updatedPhone,
            });

            await this.setValidationResult({ value: updatedValue });
      }

      async _hash(value) {
            const hash = createHash('blake2b512').update(value).digest('hex');
            return hash;
      }

      _encryptAndSign(data) {
            const encrypted = this._secretBox.encrypt(data);
            return nacl.sign(encrypted, this._signingKey.secretKey);
      }
}

class V1ValidationData {
      constructor({ email, phone, kycSmileId }) {
            this.email = email;
            this.phone = phone;
            this.kycSmileId = kycSmileId;
      }

      encryptAndSign(encryptAndSignFunction) {
            return new V1ValidationData({
                  email: this._encryptAndEncode(this.email, encryptAndSignFunction),
                  phone: this._encryptAndEncode(this.phone, encryptAndSignFunction),
                  kycSmileId: this._encryptAndEncode(this.kycSmileId, encryptAndSignFunction),
            });
      }

      _encryptAndEncode(value, encryptAndSignFunction) {
            if (!value) return null;
            const encryptedData = encryptAndSignFunction(new TextEncoder().encode(value));
            return base64encode(encryptedData);
      }
}

class SecretBox {
      constructor(key) {
            this.key = key;
      }

      encrypt(data) {
            const iv = randomBytes(12);
            const cipher = createCipheriv('aes-256-gcm', this.key, iv);
            const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
            const tag = cipher.getAuthTag();
            return Buffer.concat([iv, encrypted, tag]);
      }

      decrypt(data) {
            const iv = data.slice(0, 12);
            const tag = data.slice(data.length - 16);
            const encrypted = data.slice(12, data.length - 16);

            const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(encrypted), decipher.final()]);
      }
}

export { KycPartnerClient, V1ValidationData };
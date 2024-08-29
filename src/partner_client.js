import { createHash } from 'crypto';
import { SignJWT, importJWK } from 'jose';
import axios from 'axios';
import nacl from 'tweetnacl';
import base58 from 'bs58';
import { Buffer } from 'buffer';
import base64 from 'base-64';
import naclUtil from 'tweetnacl-util';

const { encode: encodeBase58, decode: decodeBase58 } = base58;
const { encode: base64encode, decode: base64decode } = base64;


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
            await this._generateAuthToken();
            await this._initializeEncryption();
      }

      async _initializeEncryption() {
            const authPrivateKey = await this.authKeyPair.getPrivateKeyBytes();

            console.log("Auth Private Key Length:", authPrivateKey.length);
            const authPublicKeyBytes = decodeBase58(this._authPublicKey);
            console.log("Auth Public Key Length:", authPublicKeyBytes.length);

            const seed = authPrivateKey.slice(0, 32);
            console.log("Seed Length:", seed.length);

            this._signingKey = nacl.sign.keyPair.fromSeed(seed);
      }


      async _generateAuthToken() {
            const base58Seed = '8ui6TQMfAudigNuKycopDyZ6irMeS7DTSe73d2gzv1Hz';
            const seed = base58.decode(base58Seed);
            if (seed.length !== 32) {
                  throw new Error('Invalid seed length. Seed must be 32 bytes long.');
            }

            const authKeyPair = nacl.sign.keyPair.fromSeed(seed);

            const publicKeyBytes = authKeyPair.publicKey;
            console.log("publicKeyBytes:", publicKeyBytes.length);

            const privateKeyBytes = authKeyPair.secretKey;
            console.log("privateKeyBytes:", privateKeyBytes.length);

            this._authPublicKey = encodeBase58(publicKeyBytes);

            //   const privateKeyBytes = this._signingKey.secretKey.slice(0, 32); // Only the seed part of the secret key
            const privateKeyJWK = {
                  kty: 'OKP',
                  crv: 'Ed25519',
                  x: Buffer.from(publicKeyBytes).toString('base64url'),
                  d: Buffer.from(privateKeyBytes.slice(0, 32)).toString('base64url'),
            };


            let privateKey;
            try {
                  privateKey = await importJWK(privateKeyJWK, 'EdDSA');
            } catch (error) {
                  console.error("Error importing JWK:", error);
                  throw error;
            }

            try {
                  this._token = await new SignJWT({})
                        .setProtectedHeader({ alg: 'EdDSA', iss: this._authPublicKey })
                        .sign(privateKey);
            } catch (error) {
                  console.error("Error signing JWT:", error);
                  throw error;
            }

            console.log("Token:", this._token);
            //this._token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MjQ5MzY1NjAsImlzcyI6IkhIVjVqb0I2RDRjMnBpZ1ZaY1E5Ulk1c3VETXZBaUhCTExCQ0ZxbVd1TTRFIn0.aVA83loop4Fh3PVrZMjMQbtymTEZ7rjLhOe6DpSNMYxnx1BcrFA6e7SAtDyqbzIa-UGEs7z_p_u6ol-s5uuvBQ';

            const instance = axios.create({
                  baseURL: this.baseUrl,
            });

            instance.interceptors.request.use(config => {
                  config.headers['Authorization'] = `Bearer ${this._token}`;
                  return config;
            });

            // Initialize API client
            this._apiClient = instance;
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


      async encryptAndSignData(data, key) {
            const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
            const ciphertext = nacl.secretbox(naclUtil.decodeUTF8(data), nonce, key);
            const encryptedData = new Uint8Array([...nonce, ...ciphertext]);

            const signature = nacl.sign(encryptedData, this._signingKey.secretKey);

            return signature;
      }

      async getData({ userPK, secretKey }) {
            const response = await this._apiClient.post('/v1/getData', { publicKey: userPK });
            const responseData = response.data['data'];

            const verifyKey = base58.decode(userPK);
            const secret = base58.decode(secretKey);

            const data = await Promise.all(
                  Object.entries(responseData).map(async ([key, value]) => {
                        const signedDataRaw = value;
                        if (!signedDataRaw) return [key, ''];

                        const signedMessage = naclUtil.decodeBase64(signedDataRaw);
                        const message = nacl.sign.open(signedMessage, verifyKey);

                        if (!message) {
                              throw new Error(`Invalid signature for key: ${key}`);
                        }

                        const decrypted = await this.decryptData(message, secret);

                        return [key, ['photoSelfie', 'photoIdCard'].includes(key) ? decrypted : new TextDecoder().decode(decrypted)];
                  })
            );

            return Object.fromEntries(data);
      }

      async setValidationResult({ value, userPk, secretKey }) {
            const encryptedValue = value.encryptAndSign(this._encryptAndSign.bind(this));

            await this._apiClient.post('/v1/setValidationResult', { data: encryptedValue, userPublicKey: userPk });
      }

      async getValidationResult({ key, validatorPK, secretKey, userPk }) {
            const response = await this._apiClient.post('/v1/getValidationResult', {
                  validatorPublicKey: validatorPK,
                  userPublicKey: userPk,
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

export { KycPartnerClient, V1ValidationData };
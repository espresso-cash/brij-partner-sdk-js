import { createHash } from "crypto";
import { base64url } from "jose";
import axios, { AxiosInstance } from "axios";
import nacl from "tweetnacl";
import base58 from "bs58";
import naclUtil from "tweetnacl-util";
import ed2curve from "ed2curve";
import {
  documentTypeToJSON,
  ValidationStatus as ProtoValidationStatus,
  WrappedData,
  WrappedValidation,
} from "./generated/protos/data.js";

const _kycBaseURL = "https://kyc-backend-oxvpvdtvzq-ew.a.run.app";
const _orderBaseURL = "https://kyc-backend-orders-402681483920.europe-west1.run.app/";

interface AuthKeyPair {
  getPrivateKeyBytes(): Promise<Uint8Array>;

  getPublicKeyBytes(): Promise<Uint8Array>;
}

interface XFlowPartnerClientOptions {
  authKeyPair: AuthKeyPair;
  kycBaseUrl?: string;
  orderBaseUrl?: string;
}

export type OrderIds = { orderId: string; externalId?: "" } | { orderId?: ""; externalId: string };

export type CompleteOnRampOrderParams = OrderIds & { transactionId: string };

export type FailOrderParams = OrderIds & { reason: string };

export type AcceptOnRampOrderParams = {
  orderId: string;
  bankName: string;
  bankAccount: string;
  externalId?: string;
};

export type AcceptOffRampOrderParams = {
  orderId: string;
  cryptoWalletAddress: string;
  externalId?: string;
};

export type RejectOrderParams = { orderId: string; reason: string };

export type DataAccessParams = { userPK: string; secretKey: string };

export type UserDataField = { dataId: string; status: ValidationStatus };

export type UserDataValueField<T> = { value: T } & UserDataField;

export type UserData = {
  email: Array<UserDataValueField<string>>;
  phone: Array<UserDataValueField<string>>;
  name: Array<{ firstName: string; lastName: string } & UserDataField>;
  birthDate: Array<UserDataValueField<Date>>;
  document: Array<{ type: string; number: string; countryCode: string } & UserDataField>;
  bankInfo: Array<{ bankName: string; accountNumber: string; bankCode: string } & UserDataField>;
  selfie: Array<UserDataValueField<Uint8Array>>;
  custom: Record<string, string>;
};

type ValidationResult = { dataId: string; value: string; status: ProtoValidationStatus };

type CustomValidationResult = { type: string; value: string };

export enum ValidationStatus {
  Unspecified = "UNSPECIFIED",
  Pending = "PENDING",
  Approved = "APPROVED",
  Rejected = "REJECTED",
  Unverified = "UNVERIFIED",
}

export type Order = {
  orderId: string;
  externalId?: string;
  created: string;
  status: string;
  partnerPublicKey: string;
  userPublicKey: string;
  comment: string;
  type: "ON_RAMP" | "OFF_RAMP";
  cryptoAmount: string;
  cryptoCurrency: string;
  fiatAmount: string;
  fiatCurrency: string;
  bankName: string;
  bankAccount: string;
  cryptoWalletAddress: string;
  transaction: string;
  transactionId: string;
};

function toValidationStatus(protoStatus: ProtoValidationStatus): ValidationStatus {
  switch (protoStatus) {
    case ProtoValidationStatus.VALIDATION_STATUS_UNSPECIFIED:
      return ValidationStatus.Unspecified;
    case ProtoValidationStatus.VALIDATION_STATUS_PENDING:
      return ValidationStatus.Pending;
    case ProtoValidationStatus.VALIDATION_STATUS_APPROVED:
      return ValidationStatus.Approved;
    case ProtoValidationStatus.VALIDATION_STATUS_REJECTED:
      return ValidationStatus.Rejected;
    default:
      return ValidationStatus.Unspecified;
  }
}

export class XFlowPartnerClient {
  private authKeyPair: AuthKeyPair;
  private readonly kycBaseUrl: string;
  private readonly orderBaseUrl: string;
  private _authPublicKey: string;
  private _kycClient: AxiosInstance | null;
  private _orderClient: AxiosInstance | null;

  private constructor({ authKeyPair, kycBaseUrl, orderBaseUrl }: XFlowPartnerClientOptions) {
    this.authKeyPair = authKeyPair;
    this.kycBaseUrl = kycBaseUrl || _kycBaseURL;
    this.orderBaseUrl = orderBaseUrl || _orderBaseURL;
    this._authPublicKey = "";
    this._kycClient = null;
    this._orderClient = null;
  }

  static async generateKeyPair() {
    const keyPair = nacl.sign.keyPair();
    return {
      publicKey: base58.encode(keyPair.publicKey),
      privateKey: base58.encode(keyPair.secretKey),
      secretKey: base58.encode(keyPair.secretKey),
      seed: base58.encode(keyPair.secretKey.slice(0, 32)),
      getPublicKeyBytes: async () => keyPair.publicKey,
      getPrivateKeyBytes: async () => keyPair.secretKey,
    };
  }

  static async fromSeed(seed: string): Promise<XFlowPartnerClient> {
    const decoded = base58.decode(seed);
    const authKeyPair = nacl.sign.keyPair.fromSeed(decoded);

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

  private async init() {
    await Promise.all([this.generateAuthToken()]);
  }

  private async generateAuthToken() {
    const [publicKeyBytes, privateKeyBytes] = await Promise.all([
      this.authKeyPair.getPublicKeyBytes(),
      this.authKeyPair.getPrivateKeyBytes(),
    ]);

    this._authPublicKey = base58.encode(publicKeyBytes);

    const kycToken = await this.createToken(privateKeyBytes, "kyc.espressocash.com");

    this._kycClient = axios.create({
      baseURL: this.kycBaseUrl,
      headers: { Authorization: `Bearer ${kycToken}` },
    });

    const orderToken = await this.createToken(privateKeyBytes, "orders.espressocash.com");

    this._orderClient = axios.create({
      baseURL: this.orderBaseUrl,
      headers: { Authorization: `Bearer ${orderToken}` },
    });
  }

  private async createToken(privateKeyBytes: Uint8Array, audience: string): Promise<string> {
    const header = { alg: "EdDSA", typ: "JWT" };
    const payload = {
      iss: this._authPublicKey,
      iat: Math.floor(Date.now() / 1000),
      aud: audience,
    };

    const encodedHeader = base64url.encode(JSON.stringify(header));
    const encodedPayload = base64url.encode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = nacl.sign.detached(new TextEncoder().encode(dataToSign), privateKeyBytes);

    return `${dataToSign}.${base64url.encode(signature)}`;
  }

  async getUserData({ userPK, secretKey }: DataAccessParams): Promise<UserData> {
    const response = await this._kycClient!.post("/v1/getUserData", {
      userPublicKey: userPK,
    });
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
          value: wrappedData.hash.hash,
          status: wrappedData.hash.status,
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

    const userData: UserData = {
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

      const signedMessage = naclUtil.decodeBase64(encryptedData);
      const message = nacl.sign.open(signedMessage, userVerifyKey);

      if (!message) {
        throw new Error(`Invalid signature for key`);
      }
      const decryptedData = await this.decryptData(message, secret);
      const wrappedData = WrappedData.decode(new Uint8Array(decryptedData));

      const dataId = encrypted.id;
      const verificationData = validationMap.get(dataId);

      let status = ValidationStatus.Unspecified;
      if (verificationData) {
        const hash = await this.generateHash(wrappedData);
        const hashMatching = hash === verificationData.value;
        status = hashMatching ? toValidationStatus(verificationData.status) : ValidationStatus.Unverified;
      }

      const commonFields: UserDataField = { dataId, status };
      if (wrappedData.email) {
        userData.email.push({ value: wrappedData.email, ...commonFields });
      } else if (wrappedData.name) {
        userData.name.push({
          firstName: wrappedData.name.firstName,
          lastName: wrappedData.name.lastName,
          ...commonFields,
        });
      } else if (wrappedData.birthDate) {
        userData.birthDate.push({ value: new Date(wrappedData.birthDate), ...commonFields });
      } else if (wrappedData.phone) {
        userData.phone.push({ value: wrappedData.phone, ...commonFields });
      } else if (wrappedData.document) {
        userData.document.push({
          type: documentTypeToJSON(wrappedData.document.type),
          number: wrappedData.document.number,
          countryCode: wrappedData.document.countryCode,
          ...commonFields,
        });
      } else if (wrappedData.bankInfo) {
        userData.bankInfo.push({
          bankName: wrappedData.bankInfo.bankName,
          accountNumber: wrappedData.bankInfo.accountNumber,
          bankCode: wrappedData.bankInfo.bankCode,
          ...commonFields,
        });
      } else if (wrappedData.selfieImage) {
        userData.selfie.push({ value: wrappedData.selfieImage, ...commonFields });
      }
    }

    return userData;
  }

  private async decryptOrderFields(order: Order, secretKey: Uint8Array): Promise<Order> {
    const decryptField = async (field: string | undefined) => {
      if (!field) return "";
      try {
        const encryptedData = naclUtil.decodeBase64(field);
        return new TextDecoder().decode(await this.decryptData(encryptedData, secretKey));
      } catch {
        return field;
      }
    };

    return {
      ...order,
      bankAccount: await decryptField(order.bankAccount),
      bankName: await decryptField(order.bankName),
    };
  }

  async getOrder({ externalId, orderId }: OrderIds): Promise<Order> {
    const response = await this._orderClient!.post("/v1/getOrder", {
      orderId: orderId,
      externalId: externalId,
    });

    const secretKey = await this.getUserSecretKey(response.data.userPublicKey);
    return this.decryptOrderFields(response.data, base58.decode(secretKey));
  }

  async getPartnerOrders(): Promise<Order[]> {
    const response = await this._orderClient!.post("/v1/getPartnerOrders");

    return Promise.all(
      response.data.orders.map(async (order: Order) => {
        const secretKey = await this.getUserSecretKey(order.userPublicKey);
        return this.decryptOrderFields(order, base58.decode(secretKey));
      })
    );
  }

  async acceptOnRampOrder({ orderId, bankName, bankAccount, externalId }: AcceptOnRampOrderParams): Promise<void> {
    await this._orderClient!.post("/v1/acceptOrder", {
      orderId: orderId,
      bankName: bankName,
      bankAccount: bankAccount,
      externalId: externalId,
    });
  }

  async completeOnRampOrder({ orderId, transactionId, externalId }: CompleteOnRampOrderParams): Promise<void> {
    await this._orderClient!.post("/v1/completeOrder", {
      orderId: orderId,
      transactionId: transactionId,
      externalId: externalId,
    });
  }

  async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams): Promise<void> {
    await this._orderClient!.post("/v1/acceptOrder", {
      orderId: orderId,
      cryptoWalletAddress: cryptoWalletAddress,
      externalId: externalId,
    });
  }

  async completeOffRampOrder({ orderId, externalId }: OrderIds): Promise<void> {
    await this._orderClient!.post("/v1/completeOrder", {
      orderId: orderId,
      externalId: externalId,
    });
  }

  async failOrder({ orderId, reason, externalId }: FailOrderParams): Promise<void> {
    await this._orderClient!.post("/v1/failOrder", {
      orderId: orderId,
      reason: reason,
      externalId: externalId,
    });
  }

  async rejectOrder({ orderId, reason }: RejectOrderParams): Promise<void> {
    await this._orderClient!.post("/v1/rejectOrder", {
      orderId: orderId,
      reason: reason,
    });
  }

  async getUserInfo(publicKey: string) {
    const response = await this._kycClient!.post("/v1/getInfo", {
      publicKey: publicKey,
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

    const decryptedSecretKey = nacl.box.open(ciphertext, nonce, x25519PublicKey, x25519PrivateKey);

    if (!decryptedSecretKey) {
      throw new Error("Decryption failed");
    }

    return base58.encode(decryptedSecretKey);
  }

  private async decryptData(encryptedMessage: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const nonce = encryptedMessage.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = encryptedMessage.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, key);

    if (!decrypted) {
      throw new Error("Unable to decrypt data");
    }

    return decrypted;
  }

  private async generateHash(value: WrappedData): Promise<string> {
    const serializedData = WrappedData.encode(value).finish();
    return createHash("sha256").update(Buffer.from(serializedData)).digest("hex");
  }
}

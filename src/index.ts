import { base64url } from "jose";
import nacl from "tweetnacl";
import { createClient } from "@connectrpc/connect";
import base58 from "bs58";
import naclUtil from "tweetnacl-util";
import ed2curve from "ed2curve";
import { AppConfig } from "./config/config";
import * as protobuf from "@bufbuild/protobuf";
import { createTransport } from "./grpc/transport";
import { PartnerService } from 'brij_protos_js/gen/brij/storage/v1/partner/service_pb';
import { GetOrderResponse, PartnerService as OrderService } from 'brij_protos_js/gen/brij/orders/v1/partner/partner_pb';
import {
  DataType,
  EmailSchema,
  PhoneSchema,
  NameSchema,
  CitizenshipSchema,
  BirthDateSchema,
  DocumentSchema,
  BankInfoSchema,
  SelfieImageSchema,
  DocumentType,
} from 'brij_protos_js/gen/brij/storage/v1/common/data_pb';

import { RampType as ProtoRampType } from "brij_protos_js/gen/brij/orders/v1/common/ramp_type_pb";
import {
  OrderIds,
  CompleteOnRampOrderParams,
  FailOrderParams,
  AcceptOnRampOrderParams,
  AcceptOffRampOrderParams,
  RejectOrderParams,
  DataAccessParams,
  UserData,
  ValidationStatus,
  toValidationStatus,
  UpdateFeesParams,
  UserDataField,
  Order,
  RampType,
  KycStatusDetails,
  KycItem,
  toKycStatus,
} from "./models/models";

import { KycEnvelopeSchema } from 'brij_protos_js/gen/brij/storage/v1/common/kyc_pb';
import { ValidationDataEnvelope, ValidationDataEnvelopeSchema } from 'brij_protos_js/gen/brij/storage/v1/common/validation_data_pb';
import { UserDataEnvelopeSchema } from 'brij_protos_js/gen/brij/storage/v1/common/user_data_pb';
import { OnRampOrderUserEnvelopeSchema, OffRampOrderUserEnvelopeSchema, OnRampOrderPartnerEnvelopeSchema, OffRampOrderPartnerEnvelopeSchema, OffRampOrderPartnerEnvelope, OnRampOrderPartnerEnvelope } from 'brij_protos_js/gen/brij/orders/v1/common/envelopes_pb';

interface AuthKeyPair {
  getPrivateKeyBytes(): Promise<Uint8Array>;

  getPublicKeyBytes(): Promise<Uint8Array>;
}

interface BrijPartnerClientOptions {
  authKeyPair: AuthKeyPair;
  appConfig?: AppConfig;
}

export class BrijPartnerClient {
  private authKeyPair: AuthKeyPair;
  private readonly storageBaseUrl: string;
  private readonly orderBaseUrl: string;
  private _authPublicKey: string;
  private _storageClient: ReturnType<typeof createClient<typeof PartnerService>> | null;
  private _orderClient: ReturnType<typeof createClient<typeof OrderService>> | null;
  private readonly _verifierAuthPk: string;

  private constructor({ authKeyPair, appConfig = AppConfig.demo() }: BrijPartnerClientOptions) {
    this.authKeyPair = authKeyPair;
    this.storageBaseUrl = appConfig.storageBaseUrl;
    this.orderBaseUrl = appConfig.orderBaseUrl;
    this._verifierAuthPk = appConfig.verifierAuthPk;
    this._authPublicKey = "";
    this._storageClient = null;
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

  static async fromSeed(seed: string, appConfig?: AppConfig): Promise<BrijPartnerClient> {
    const decoded = base58.decode(seed);
    const authKeyPair = nacl.sign.keyPair.fromSeed(decoded);

    const client = new BrijPartnerClient({
      authKeyPair: {
        async getPrivateKeyBytes() {
          return authKeyPair.secretKey;
        },
        async getPublicKeyBytes() {
          return authKeyPair.publicKey;
        },
      },
      appConfig,
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

    const storageToken = await this.createToken(privateKeyBytes, "storage.brij.fi");

    const storageTransport = createTransport(this.storageBaseUrl, storageToken);
    this._storageClient = createClient(PartnerService, storageTransport);

    const orderToken = await this.createToken(privateKeyBytes, "orders.brij.fi");
    const orderTransport = createTransport(this.orderBaseUrl, orderToken);
    this._orderClient = createClient(OrderService, orderTransport);
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

  async getUserData({ userPK, secretKey, includeValues = true }: DataAccessParams): Promise<UserData> {
    const response = await this._storageClient!.getUserData({
      userPublicKey: userPK,
      includeValues,
    });

    const validationMap = new Map<string, ValidationDataEnvelope>(
      response.validationData.map((data) => {
        const validation = protobuf.fromBinary(ValidationDataEnvelopeSchema, data.payload);

        return [
          validation.dataHash,
          validation,
        ];
      })
    );

    const userData: UserData = {};
    const secret = base58.decode(secretKey);

    const documentList: ({ type: DocumentType; number: string; countryCode: string } & UserDataField)[] = [];
    const bankInfoList: ({ bankName: string; accountNumber: string; bankCode: string; countryCode: string } & UserDataField)[] = [];

    for (const encrypted of response.userData) {
      const user = protobuf.fromBinary(UserDataEnvelopeSchema, encrypted.payload);

      const decryptedData = user.encryptedValue && user.encryptedValue.length > 0
        ? await this.decryptData(user.encryptedValue, secret)
        : new Uint8Array(0);

      const hash = encrypted.hash;
      const verificationData = validationMap.get(hash);
      const commonFields: UserDataField = {
        hash: hash
      };

      switch (user.type) {
        case DataType.EMAIL: {
          const data = protobuf.fromBinary(EmailSchema, decryptedData);
          userData.email = {
            value: data.value,
            ...commonFields,
            status: toValidationStatus(verificationData?.status) ?? ValidationStatus.Unspecified
          };
          break;
        }
        case DataType.PHONE: {
          const data = protobuf.fromBinary(PhoneSchema, decryptedData);
          userData.phone = {
            value: data.value,
            ...commonFields,
            status: toValidationStatus(verificationData?.status) ?? ValidationStatus.Unspecified
          };
          break;
        }
        case DataType.NAME: {
          const data = protobuf.fromBinary(NameSchema, decryptedData);
          userData.name = {
            firstName: data.firstName,
            lastName: data.lastName,
            ...commonFields,
          };
          break;
        }
        case DataType.CITIZENSHIP: {
          const data = protobuf.fromBinary(CitizenshipSchema, decryptedData);
          userData.citizenship = {
            value: data.value,
            ...commonFields
          };
          break;
        }
        case DataType.BIRTH_DATE: {
          const data = protobuf.fromBinary(BirthDateSchema, decryptedData);
          userData.birthDate = {
            value: data.value ? new Date(Number(data.value.seconds) * 1000 + Number(data.value.nanos) / 1_000_000) : new Date(),
            ...commonFields
          };
          break;
        }
        case DataType.DOCUMENT: {
          const data = protobuf.fromBinary(DocumentSchema, decryptedData);
          documentList.push({
            type: data.type,
            number: data.number,
            countryCode: data.countryCode,
            ...commonFields,
          });
          break;
        }
        case DataType.BANK_INFO: {
          const data = protobuf.fromBinary(BankInfoSchema, decryptedData);
          bankInfoList.push({
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            bankCode: data.bankCode,
            countryCode: data.countryCode,
            ...commonFields,
          });
          break;
        }
        case DataType.SELFIE_IMAGE: {
          const data = protobuf.fromBinary(SelfieImageSchema, decryptedData);
          userData.selfie = {
            value: data.value,
            ...commonFields
          };
          break;
        }
      }
    }

    if (documentList.length > 0) {
      userData.documents = documentList;
    }
    if (bankInfoList.length > 0) {
      userData.bankInfos = bankInfoList;
    }

    return userData;
  }

  private async processOrder(order: GetOrderResponse): Promise<GetOrderResponse> {
    const decryptedOrder = order;

    if (order.userSignature && order.userSignature.length > 0) {
      const userVerifyKey = base58.decode(order.userPublicKey);

      const isValidUserSig = nacl.sign.detached.verify(
        order.userPayload,
        order.userSignature,
        userVerifyKey
      );

      if (!isValidUserSig) {
        throw new Error("Invalid user signature");
      }
    }

    if (order.partnerSignature && order.partnerSignature.length > 0) {
      const partnerVerifyKey = base58.decode(order.partnerPublicKey);

      const isValidPartnerSig = nacl.sign.detached.verify(
        order.partnerPayload,
        order.partnerSignature,
        partnerVerifyKey
      );

      if (!isValidPartnerSig) {
        throw new Error("Invalid partner signature");
      }
    }

    return decryptedOrder;
  }

  async getOrder({ externalId, orderId }: OrderIds): Promise<Order> {
    const response = await this._orderClient!.getOrder({
      orderId,
      externalId,
    });

    const processedOrder = await this.processOrder(response);
    return this.transformToOrder(processedOrder);
  }

  async getPartnerOrders(): Promise<Order[]> {
    const response = await this._orderClient!.getOrders({});
    const partnerOrders: Order[] = [];

    for (const order of response.orders) {
      try {
        const processedOrder = await this.processOrder(order);
        partnerOrders.push(this.transformToOrder(processedOrder));
      } catch {
        continue;
      }
    }

    return partnerOrders;
  }

  private transformToOrder(orderResponse: GetOrderResponse): Order {
    switch (orderResponse.type) {
      case ProtoRampType.ON_RAMP: {
        const userEnvelope = protobuf.fromBinary(OnRampOrderUserEnvelopeSchema, orderResponse.userPayload);
        const partnerEnvelope = protobuf.fromBinary(OnRampOrderPartnerEnvelopeSchema, orderResponse.partnerPayload);

        return {
          orderId: userEnvelope.orderId,
          externalId: orderResponse.externalId || undefined,
          created: orderResponse.created,
          status: orderResponse.status,
          partnerPublicKey: orderResponse.partnerPublicKey,
          userPublicKey: orderResponse.userPublicKey,
          type: this.mapRampType(orderResponse.type),
          cryptoAmount: userEnvelope.cryptoAmount,
          cryptoCurrency: userEnvelope.cryptoCurrency,
          fiatAmount: userEnvelope.fiatAmount,
          fiatCurrency: userEnvelope.fiatCurrency,
          bankName: partnerEnvelope.bankName,
          bankAccount: partnerEnvelope.bankAccount,
          cryptoWalletAddress: "",
          transaction: orderResponse.transaction,
          transactionId: orderResponse.transactionId,
          userSignature: orderResponse.userSignature || undefined,
          partnerSignature: orderResponse.partnerSignature || undefined,
          userWalletAddress: userEnvelope.userWalletAddress || undefined,
          walletPublicKey: userEnvelope.walletPublicKey || undefined,
        };
      }
      case ProtoRampType.OFF_RAMP: {
        const userEnvelope = protobuf.fromBinary(OffRampOrderUserEnvelopeSchema, orderResponse.userPayload);
        const partnerEnvelope = protobuf.fromBinary(OffRampOrderPartnerEnvelopeSchema, orderResponse.partnerPayload);

        return {
          orderId: userEnvelope.orderId,
          externalId: orderResponse.externalId || undefined,
          created: orderResponse.created,
          status: orderResponse.status,
          partnerPublicKey: orderResponse.partnerPublicKey,
          userPublicKey: orderResponse.userPublicKey,
          type: this.mapRampType(orderResponse.type),
          cryptoAmount: userEnvelope.cryptoAmount,
          cryptoCurrency: userEnvelope.cryptoCurrency,
          fiatAmount: userEnvelope.fiatAmount,
          fiatCurrency: userEnvelope.fiatCurrency,
          bankName: "",
          bankAccount: "",
          cryptoWalletAddress: partnerEnvelope.cryptoWalletAddress,
          transaction: orderResponse.transaction,
          transactionId: orderResponse.transactionId,
          userSignature: orderResponse.userSignature || undefined,
          partnerSignature: orderResponse.partnerSignature || undefined,
          userWalletAddress: userEnvelope.userWalletAddress || undefined,
          walletPublicKey: userEnvelope.walletPublicKey || undefined,
        };
      }
      default: {
        throw new Error("Invalid order type");
      }
    }
  }

  private mapRampType(protoRampType: ProtoRampType): RampType {
    switch (protoRampType) {
      case ProtoRampType.UNSPECIFIED:
        return RampType.Unspecified;
      case ProtoRampType.ON_RAMP:
        return RampType.OnRamp;
      case ProtoRampType.OFF_RAMP:
        return RampType.OffRamp;
      default:
        return RampType.Unspecified;
    }
  }

  async acceptOnRampOrder({
    orderId,
    bankName,
    bankAccount,
    externalId,
  }: AcceptOnRampOrderParams): Promise<void> {
    const partnerEnvelope = protobuf.create(OnRampOrderPartnerEnvelopeSchema, {
      orderId: orderId,
      bankName: bankName,
      bankAccount: bankAccount,
    });

    const partnerPayload = protobuf.toBinary(OnRampOrderPartnerEnvelopeSchema, partnerEnvelope);

    const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
    const signature = nacl.sign.detached(partnerPayload, privateKeyBytes);

    await this._orderClient!.acceptOrder({
      payload: partnerPayload,
      signature: signature,
      externalId: externalId,
    });
  }

  async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams): Promise<void> {
    const partnerEnvelope = protobuf.create(OffRampOrderPartnerEnvelopeSchema, {
      orderId: orderId,
      cryptoWalletAddress: cryptoWalletAddress,
    });

    const partnerPayload = protobuf.toBinary(OffRampOrderPartnerEnvelopeSchema, partnerEnvelope);

    const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
    const signature = nacl.sign.detached(partnerPayload, privateKeyBytes);

    await this._orderClient!.acceptOrder({
      payload: partnerPayload,
      signature: signature,
      externalId: externalId,
    });
  }

  async completeOnRampOrder({ orderId, transactionId, externalId }: CompleteOnRampOrderParams): Promise<void> {
    await this._orderClient!.completeOrder({
      orderId: orderId,
      transactionId: transactionId,
      externalId: externalId,
    });
  }

  async completeOffRampOrder({ orderId, externalId }: OrderIds): Promise<void> {
    await this._orderClient!.completeOrder({
      orderId: orderId,
      externalId: externalId,
    });
  }

  async failOrder({ orderId, reason, externalId }: FailOrderParams): Promise<void> {
    await this._orderClient!.failOrder({
      orderId: orderId,
      reason: reason,
      externalId: externalId,
    });
  }

  async rejectOrder({ orderId, reason }: RejectOrderParams): Promise<void> {
    await this._orderClient!.rejectOrder({
      orderId: orderId,
      reason: reason,
    });
  }

  async updateFees(params: UpdateFeesParams): Promise<void> {
    await this._orderClient!.updateFees(params);
  }

  async getUserInfo(publicKey: string) {
    const response = await this._storageClient!.getInfo({
      publicKey: publicKey,
    });

    return response;
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

  async getKycStatusDetails(params: { userPK: string; country: string; secretKey: string }): Promise<KycStatusDetails> {
    const response = await this._storageClient!.getKycStatus({
      userPublicKey: params.userPK,
      country: params.country,
      validatorPublicKey: this._verifierAuthPk,
    });

    const uint8Array = response.payload;
    const decoded = protobuf.fromBinary(KycEnvelopeSchema, uint8Array);

    const secret = base58.decode(params.secretKey);

    const decryptedAdditionalData = Object.fromEntries(
      await Promise.all(
        Object.entries(decoded.additionalData).map(async ([key, value]) => {
          if (!value || value.length === 0) {
            return [key, ""];
          }

          const encryptedBytes = typeof value === "string" ? naclUtil.decodeBase64(value) : value;
          const decryptedBytes = await this.decryptData(encryptedBytes, secret);
          return [key, new TextDecoder().decode(decryptedBytes)];
        })
      )
    );

    const kycStatus = toKycStatus(decoded.status);

    const kycItem: KycItem = {
      countries: decoded.countries,
      status: kycStatus,
      provider: decoded.provider,
      userPublicKey: decoded.userPublicKey,
      hashes: decoded.hashes,
      additionalData: decryptedAdditionalData,
    };

    return {
      status: kycStatus,
      data: kycItem,
      signature: base58.encode(response.signature),
    };
  }

  private async decryptData(encryptedMessage: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    if (encryptedMessage.length < nacl.secretbox.nonceLength) {
      throw new Error(`Encrypted message too short: ${encryptedMessage.length} bytes`);
    }

    const nonce = encryptedMessage.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = encryptedMessage.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
    if (!decrypted) {
      throw new Error("Unable to decrypt data");
    }

    return decrypted;
  }
}

export { AppConfig };
export * from "./models/models";

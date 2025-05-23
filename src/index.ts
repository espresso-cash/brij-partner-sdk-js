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
import { convertToDecimalPrecision } from "./utils/currency";
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
  ValidationResult,
  Order,
  RampType,
} from "./models/models";

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

    const validationMap = new Map<string, ValidationResult>(
      response.validationData.map((data: { dataId: string; hash: string; status: number }) => [
        data.dataId,
        {
          dataId: data.dataId,
          value: data.hash,
          status: toValidationStatus(data.status),
        },
      ])
    );

    const userData: UserData = {};
    const secret = base58.decode(secretKey);

    const documentList: ({ type: DocumentType; number: string; countryCode: string } & UserDataField)[] = [];
    const bankInfoList: ({ bankName: string; accountNumber: string; bankCode: string; countryCode: string } & UserDataField)[] = [];

    for (const encrypted of response.userData) {
      const decryptedData = encrypted.encryptedValue && encrypted.encryptedValue.length > 0
        ? await this.decryptData(encrypted.encryptedValue, secret)
        : new Uint8Array(0);

      const dataId = encrypted.id;
      const verificationData = validationMap.get(dataId);
      const commonFields: UserDataField = {
        dataId,
        hash: encrypted.hash
      };

      switch (encrypted.type) {
        case DataType.EMAIL: {
          const data = protobuf.fromBinary(EmailSchema, decryptedData);
          userData.email = {
            value: data.value,
            ...commonFields,
            ...commonFields,
            status: verificationData?.status ?? ValidationStatus.Unspecified
          };
          break;
        }
        case DataType.PHONE: {
          const data = protobuf.fromBinary(PhoneSchema, decryptedData);
          userData.phone = {
            value: data.value,
            ...commonFields,
            status: verificationData?.status ?? ValidationStatus.Unspecified
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

  private async decryptOrderFields(order: GetOrderResponse, secretKey: Uint8Array): Promise<GetOrderResponse> {
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

  private async processOrder(order: GetOrderResponse, secretKey: Uint8Array): Promise<GetOrderResponse> {
    const decryptedOrder = await this.decryptOrderFields(order, secretKey);

    if (order.userSignature) {
      const userVerifyKey = base58.decode(order.userPublicKey);
      const userMessage =
        order.type === ProtoRampType.ON_RAMP
          ? this.createUserOnRampMessage({
            orderId: order.orderId,
            cryptoAmount: order.cryptoAmount,
            cryptoCurrency: order.cryptoCurrency,
            fiatAmount: order.fiatAmount,
            fiatCurrency: order.fiatCurrency,
            cryptoWalletAddress: order.userWalletAddress ?? "",
          })
          : this.createUserOffRampMessage({
            orderId: order.orderId,
            cryptoAmount: order.cryptoAmount,
            cryptoCurrency: order.cryptoCurrency,
            fiatAmount: order.fiatAmount,
            fiatCurrency: order.fiatCurrency,
            encryptedBankName: order.bankName,
            encryptedBankAccount: order.bankAccount,
            cryptoWalletAddress: order.userWalletAddress ?? "",
          });

      const isValidUserSig = nacl.sign.detached.verify(
        new TextEncoder().encode(userMessage),
        base58.decode(order.userSignature),
        userVerifyKey
      );

      if (!isValidUserSig) {
        throw new Error("Invalid user signature");
      }
    }

    if (order.partnerSignature) {
      const partnerVerifyKey = base58.decode(order.partnerPublicKey);
      const partnerMessage =
        order.type === ProtoRampType.ON_RAMP
          ? this.createPartnerOnRampMessage({
            orderId: order.orderId,
            cryptoAmount: order.cryptoAmount,
            cryptoCurrency: order.cryptoCurrency,
            fiatAmount: order.fiatAmount,
            fiatCurrency: order.fiatCurrency,
            encryptedBankName: order.bankName,
            encryptedBankAccount: order.bankAccount,
          })
          : this.createPartnerOffRampMessage({
            orderId: order.orderId,
            cryptoAmount: order.cryptoAmount,
            cryptoCurrency: order.cryptoCurrency,
            fiatAmount: order.fiatAmount,
            fiatCurrency: order.fiatCurrency,
            cryptoWalletAddress: order.cryptoWalletAddress,
          });

      const isValidPartnerSig = nacl.sign.detached.verify(
        new TextEncoder().encode(partnerMessage),
        base58.decode(order.partnerSignature),
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

    const secretKey = await this.getUserSecretKey(response.userPublicKey);
    const processedOrder = await this.processOrder(response, base58.decode(secretKey));
    return this.transformToOrder(processedOrder);
  }

  async getPartnerOrders(): Promise<Order[]> {
    const response = await this._orderClient!.getOrders({});
    const partnerOrders: Order[] = [];

    for (const order of response.orders) {
      try {
        const secretKey = await this.getUserSecretKey(order.userPublicKey);
        const processedOrder = await this.processOrder(order, base58.decode(secretKey));
        partnerOrders.push(this.transformToOrder(processedOrder));
      } catch {
        continue;
      }
    }

    return partnerOrders;
  }

  private transformToOrder(orderResponse: GetOrderResponse): Order {
    return {
      orderId: orderResponse.orderId,
      externalId: orderResponse.externalId || undefined,
      created: orderResponse.created,
      status: orderResponse.status,
      partnerPublicKey: orderResponse.partnerPublicKey,
      userPublicKey: orderResponse.userPublicKey,
      comment: orderResponse.comment,
      type: this.mapRampType(orderResponse.type),
      cryptoAmount: orderResponse.cryptoAmount,
      cryptoCurrency: orderResponse.cryptoCurrency,
      fiatAmount: orderResponse.fiatAmount,
      fiatCurrency: orderResponse.fiatCurrency,
      bankName: orderResponse.bankName,
      bankAccount: orderResponse.bankAccount,
      cryptoWalletAddress: orderResponse.cryptoWalletAddress,
      transaction: orderResponse.transaction,
      transactionId: orderResponse.transactionId,
      userSignature: orderResponse.userSignature || undefined,
      partnerSignature: orderResponse.partnerSignature || undefined,
      userWalletAddress: orderResponse.userWalletAddress || undefined,
      walletPublicKey: orderResponse.walletPublicKey || undefined,
    };
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
    userSecretKey,
  }: AcceptOnRampOrderParams & { userSecretKey: string }): Promise<void> {
    const key = base58.decode(userSecretKey);
    const order = await this.getOrder({ orderId });

    const encryptField = (value: string) => {
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const ciphertext = nacl.secretbox(naclUtil.decodeUTF8(value), nonce, key);
      return naclUtil.encodeBase64(new Uint8Array([...nonce, ...ciphertext]));
    };

    const encryptedBankName = encryptField(bankName);
    const encryptedBankAccount = encryptField(bankAccount);

    const signatureMessage = this.createPartnerOnRampMessage({
      orderId: order.orderId,
      cryptoAmount: order.cryptoAmount,
      cryptoCurrency: order.cryptoCurrency,
      fiatAmount: order.fiatAmount,
      fiatCurrency: order.fiatCurrency,
      encryptedBankName: encryptedBankName,
      encryptedBankAccount: encryptedBankAccount,
    });

    const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
    const signature = nacl.sign.detached(new TextEncoder().encode(signatureMessage), privateKeyBytes);

    await this._orderClient!.acceptOrder({
      orderId,
      bankName: encryptedBankName,
      bankAccount: encryptedBankAccount,
      externalId,
      partnerSignature: base58.encode(signature),
    });
  }

  async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }: AcceptOffRampOrderParams): Promise<void> {
    const order = await this.getOrder({ orderId });

    const signatureMessage = this.createPartnerOffRampMessage({
      orderId: order.orderId,
      cryptoAmount: order.cryptoAmount,
      cryptoCurrency: order.cryptoCurrency,
      fiatAmount: order.fiatAmount,
      fiatCurrency: order.fiatCurrency,
      cryptoWalletAddress,
    });

    const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
    const signature = nacl.sign.detached(new TextEncoder().encode(signatureMessage), privateKeyBytes);

    await this._orderClient!.acceptOrder({
      orderId,
      cryptoWalletAddress,
      externalId,
      partnerSignature: base58.encode(signature),
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

  // TODO: Implement this
  // async getKycStatusDetails(params: { userPK: string; country: string; secretKey: string }): Promise<GetKycStatusResponse> {
  //   const response = await this._storageClient!.getKycStatus({
  //     userPublicKey: params.userPK,
  //     country: params.country,
  //     validatorPublicKey: this._verifierAuthPk,
  //   });

  //   const uint8Array = response.data;
  //   const decoded = KycItem.decode(uint8Array);

  //   const secret = base58.decode(params.secretKey);

  //   const decryptedAdditionalData = Object.fromEntries(
  //     await Promise.all(
  //       Object.entries(decoded.additionalData).map(async ([key, value]) => {
  //         if (!value || value.length === 0) {
  //           return [key, ""];
  //         }

  //         const encryptedBytes = typeof value === "string" ? naclUtil.decodeBase64(value) : value;
  //         const decryptedBytes = await this.decryptData(encryptedBytes, secret);
  //         return [key, new TextDecoder().decode(decryptedBytes)];
  //       })
  //     )
  //   );

  //   decoded.additionalData = decryptedAdditionalData;

  //   return {
  //     ...response,
  //     data: decoded,
  //   };
  // }

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

  private createUserOnRampMessage({
    orderId,
    cryptoAmount,
    cryptoCurrency,
    fiatAmount,
    fiatCurrency,
    cryptoWalletAddress,
  }: {
    orderId: string;
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    cryptoWalletAddress: string;
  }): string {
    const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
    const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
    return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${cryptoWalletAddress}`;
  }

  private createUserOffRampMessage({
    orderId,
    cryptoAmount,
    cryptoCurrency,
    fiatAmount,
    fiatCurrency,
    encryptedBankName,
    encryptedBankAccount,
    cryptoWalletAddress,
  }: {
    orderId: string;
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    encryptedBankName: string;
    encryptedBankAccount: string;
    cryptoWalletAddress: string;
  }): string {
    const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
    const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
    return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${encryptedBankName}|${encryptedBankAccount}|${cryptoWalletAddress}`;
  }

  private createPartnerOnRampMessage({
    orderId,
    cryptoAmount,
    cryptoCurrency,
    fiatAmount,
    fiatCurrency,
    encryptedBankName,
    encryptedBankAccount,
  }: {
    orderId: string;
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    encryptedBankName: string;
    encryptedBankAccount: string;
  }): string {
    const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
    const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
    return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${encryptedBankName}|${encryptedBankAccount}`;
  }

  private createPartnerOffRampMessage({
    orderId,
    cryptoAmount,
    cryptoCurrency,
    fiatAmount,
    fiatCurrency,
    cryptoWalletAddress,
  }: {
    orderId: string;
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    cryptoWalletAddress: string;
  }): string {
    const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
    const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
    return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${cryptoWalletAddress}`;
  }
}

export { AppConfig };
export * from "./models/models";

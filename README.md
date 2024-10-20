# Partner Quick Start

## Install SDK

```
npm install https://github.com/espresso-cash/xflow-partner-client
```

## Register your Partner's Public Key

Create your key pair using the `XFlowPartnerClient.generateKeyPair()` method. Store the seed returned by this method in a safe place.

Provide us with the following information to register you in the system:

- **Public Key:** The publicKey of the generated key pair.
- **Company Name:** The name to be publicly shared with users.
- **Webhook URL:** The URL that will be used to send notifications about new orders.

## Initialize Client

Using the generated `seed`, initialize the client:

```Javascript
const client = await XFlowPartnerClient.fromSeed(seed);
```

## React to an Order

Once you receive a notification from the incoming webhook, you can retrieve the `orderId` from the JSON-encoded body.

### Getting Order Information

Use the orderId to get the order information:

```Javascript
const order = await client.getOrder(response.orderId);
console.log(order);
```

An order has the following structure:

```json
{
  "orderId": "d7ef2b01-4dc1-4fc3-be3d-dc84007ff168",
  "created": "2024-10-07T21:20:46Z",
  "status": "PENDING",
  "partnerPublicKey": "HHV5joB6D4c2pigVZcQ9RY5suDMvAiHBLLBCFqmWuM4E",
  "userPublicKey": "36qQQywHacgoTaK744BL5L5i2budJRTbed2iXGcNWy46",
  "comment": "",
  "type": "ON_RAMP",
  "cryptoAmount": "10",
  "cryptoCurrency": "usdc",
  "fiatAmount": "100",
  "fiatCurrency": "NGN",
  "bankName": "",
  "bankAccount": "",
  "cryptoWalletAddress": "",
  "transaction": "",
  "transactionId": "",
  "externalId": ""
}
```

### Getting User Data and Verification Info

To access user data, first obtain the user’s secret key:

```Javascript
const secretKey = await client.getUserSecretKey(order.userPublicKey);
console.log('userSecretKey:', secretKey);
```

> [!WARNING]
> Do not store this key in your database; instead, use the SDK to retrieve it when needed.

Using this key, you can access the user’s raw information:

```Javascript
const data = await client.getUserData({
    userPK: order.userPublicKey,
    secretKey: secretKey,
});
console.log(data);
```

You will receive the following structure, where you can see data and verification info:

```json
{
  "email": [
    {
      "value": "test@gmail.com",
      "dataId": "2bf9ad39-b213-4b77-b077-872e93301814",
      "status": "APPROVED"
    }
  ],
  "phone": [
    {
      "value": "+12345678",
      "dataId": "6d01814f-431d-4ca6-a4c3-c76ef7fc7343",
      "status": "UNSPECIFIED"
    }
  ],
  "name": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "dataId": "2a1b66b2-7bef-4b04-8f13-e7baed9e06eb",
      "status": "UNSPECIFIED"
    }
  ],
  "birthDate": [
    {
      "value": "2000-03-29T21:00:00.000Z",
      "dataId": "372b9e44-300c-443a-882b-af8cd7ff53d9",
      "status": "UNSPECIFIED"
    }
  ],
  "document": [
    {
      "type": "DOCUMENT_TYPE_VOTER_ID",
      "number": "1233123",
      "countryCode": "NG",
      "dataId": "3943bec8-b88d-450d-816b-3faab743ff24",
      "status": "UNSPECIFIED"
    }
  ],
  "bankInfo": [
    {
      "bankName": "bankName",
      "accountNumber": "accountNumber",
      "bankCode": "bankCode",
      "dataId": "54727f50-378d-4d14-bada-5f488b751361",
      "status": "UNSPECIFIED"
    }
  ],
  "selfie": [
    {
      "value": {
        "1": 60,
        "2": 115,
        "3": 118,
        "4": 103,
        "5": 32,
        "6": 119
        //...
      },
      "dataId": "372b9e44-300c-443a-882b-a3234142429",
      "status": "UNSPECIFIED"
    }
  ],
  "custom": {
    "kyc": "\"result\""
  }
}
```

> [!NOTE]
>
> - The `status` field indicates the verification status of each piece of information. Possible statuses are:
>   - `UNSPECIFIED`: The default state, not yet processed.
>   - `PENDING`: Verification is in progress.
>   - `APPROVED`: The information has been verified and approved.
>   - `REJECTED`: The information was checked but not approved.
>   - `UNVERIFIED`: The information has not been verified.
> - The `custom` field contains verification results from external sources like SmileID or other KYC providers.

### Accepting and Completing the On-Ramp Order

If, based on the user and order information, you’re ready to proceed with the order, you should accept it and specify the bank name, bank account information. You can also pass your internal order ID in the parameter as a reference:

```Javascript
await client.acceptOnRampOrder({
    orderId: order.orderId,
    bankName: 'BANK_NAME',
    bankAccount: 'BANK_ACCOUNT',
    externalId: 'EXTERNAL_ID',
});
```

Once you’ve received the payment, transfer crypto to the user’s address and complete the order by specifying the transaction ID of the crypto payment:

```Javascript
await client.completeOnRampOrder({
    orderId: order.orderId,
    transactionId: 'TRANSACTION_ID',
});
```

You can fetch the user’s wallet address using the following code:

```Javascript
const info = await client.getUserInfo(order.userPublicKey);
console.log(info.walletAddress); // EJpGLU94vxBHDFhN9sYwkQmrfTeFNpVViyy2EVaGbUky
```

### Accepting and Completing the Off-Ramp Order

Similar to On-Ramp order, once you’re ready to proceed, you should accept it and specify
the crypto wallet address and external ID:

```Javascript
await client.acceptOffRampOrder({
    orderId: order.orderId,
    cryptoWalletAddress: 'CRYPTO_WALLET_ADDRESS',
    externalId: 'EXTERNAL_ID',
});
```

Once you’ve received the payment, transfer fiat to the user’s bank account and complete the order.

```Javascript
await client.completeOffRampOrder({
    orderId: order.orderId,
});
```

You can fetch the user’s bank details using the following code:

```Javascript
const order = await client.getOrder(response.orderId);
console.log(order.bankName); // TEST BANK
console.log(order.bankAccount); // 12345678
```

### Rejecting the Order

If you’re not ready to process the order, you can reject it and specify the reason. This reason is not currently visible to the user; it is needed for internal tracking.

```Javascript
await client.rejectOrder({
    orderId: order.orderId,
    reason: 'KYC not passed'
});
```

### Failing an Accepted Order

> [!CAUTION]
> After accepting an order, it’s potentially unsafe to fail it since the user has probably sent the money. This should only be used if you’re certain that the order cannot be completed.

```Javascript
await client.failOrder({
    orderId: order.orderId,
    reason: 'invalid amount sent'
});
```

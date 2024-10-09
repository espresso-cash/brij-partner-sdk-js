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
  "externalId": "",
}
```

### Getting User Data

To access user data, first obtain the user’s secret key:

```Javascript
const secretKey = await client.getUserSecretKey(order.userPublicKey);
console.log('userSecretKey:', secretKey);
```

> [!WARNING]
> Do not store this key in your database; instead, use the SDK to retrieve it when needed.

Using this key, you can access the user’s raw information:

```Javascript
const data = await client.getData({
    userPK: order.userPublicKey,
    secretKey: secretKey,
});
console.log(data);
```

You will receive the following structure:

```json
{
  "email": "test@example.com",
  "phone": "+1234567890",
  "firstName": "",
  "middleName": "",
  "lastName": "",
  "dob": "",
  "countryCode": "",
  "idType": "",
  "idNumber": "",
  "photoIdCard": "",
  "photoSelfie": "",
  "bankAccountNumber": "",
  "bankCode": ""
}
```

### Getting Verification Info

You can check if the phone number and email have been verified using the following methods:

```Javascript
const email = await client.getEmail({
    userPK: order.userPublicKey,
    secretKey: secretKey,
});
console.log(email); // { value: 'test@example.com', verified: true }

const phone = await client.getPhone({
    userPK: order.userPublicKey,
    secretKey: secretKey,
});
console.log(phone); // { value: '+1234567890', verified: false }
```

> [!NOTE]
> Validation info from SmileID will be available soon.

### Accepting and Completing the On-Ramp Order

If, based on the user and order information, you’re ready to proceed with the order, you should accept it and specify the bank name, bank account information and external ID:

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
the crypto wallet address and and external ID:

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

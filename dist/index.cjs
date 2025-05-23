'use strict';

var jose = require('jose');
var nacl = require('tweetnacl');
var base58 = require('bs58');
var naclUtil = require('tweetnacl-util');
var ed2curve = require('ed2curve');
var protobuf = require('@bufbuild/protobuf');
var zlib = require('zlib');
var util = require('util');
var http2 = require('http2');
var http = require('http');
var https = require('https');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var nacl__default = /*#__PURE__*/_interopDefault(nacl);
var base58__default = /*#__PURE__*/_interopDefault(base58);
var naclUtil__default = /*#__PURE__*/_interopDefault(naclUtil);
var ed2curve__default = /*#__PURE__*/_interopDefault(ed2curve);
var protobuf__namespace = /*#__PURE__*/_interopNamespace(protobuf);
var zlib__namespace = /*#__PURE__*/_interopNamespace(zlib);
var http2__namespace = /*#__PURE__*/_interopNamespace(http2);
var http__namespace = /*#__PURE__*/_interopNamespace(http);
var https__namespace = /*#__PURE__*/_interopNamespace(https);

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Connect represents categories of errors as codes, and each code maps to a
 * specific HTTP status code. The codes and their semantics were chosen to
 * match gRPC. Only the codes below are valid — there are no user-defined
 * codes.
 *
 * See the specification at https://connectrpc.com/docs/protocol#error-codes
 * for details.
 */
var Code;
(function (Code) {
    /**
     * Canceled, usually be the user
     */
    Code[Code["Canceled"] = 1] = "Canceled";
    /**
     * Unknown error
     */
    Code[Code["Unknown"] = 2] = "Unknown";
    /**
     * Argument invalid regardless of system state
     */
    Code[Code["InvalidArgument"] = 3] = "InvalidArgument";
    /**
     * Operation expired, may or may not have completed.
     */
    Code[Code["DeadlineExceeded"] = 4] = "DeadlineExceeded";
    /**
     * Entity not found.
     */
    Code[Code["NotFound"] = 5] = "NotFound";
    /**
     * Entity already exists.
     */
    Code[Code["AlreadyExists"] = 6] = "AlreadyExists";
    /**
     * Operation not authorized.
     */
    Code[Code["PermissionDenied"] = 7] = "PermissionDenied";
    /**
     * Quota exhausted.
     */
    Code[Code["ResourceExhausted"] = 8] = "ResourceExhausted";
    /**
     * Argument invalid in current system state.
     */
    Code[Code["FailedPrecondition"] = 9] = "FailedPrecondition";
    /**
     * Operation aborted.
     */
    Code[Code["Aborted"] = 10] = "Aborted";
    /**
     * Out of bounds, use instead of FailedPrecondition.
     */
    Code[Code["OutOfRange"] = 11] = "OutOfRange";
    /**
     * Operation not implemented or disabled.
     */
    Code[Code["Unimplemented"] = 12] = "Unimplemented";
    /**
     * Internal error, reserved for "serious errors".
     */
    Code[Code["Internal"] = 13] = "Internal";
    /**
     * Unavailable, client should back off and retry.
     */
    Code[Code["Unavailable"] = 14] = "Unavailable";
    /**
     * Unrecoverable data loss or corruption.
     */
    Code[Code["DataLoss"] = 15] = "DataLoss";
    /**
     * Request isn't authenticated.
     */
    Code[Code["Unauthenticated"] = 16] = "Unauthenticated";
})(Code || (Code = {}));

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * codeToString returns the string representation of a Code.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function codeToString(value) {
    const name = Code[value];
    if (typeof name != "string") {
        return value.toString();
    }
    return (name[0].toLowerCase() +
        name.substring(1).replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()));
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * ConnectError captures four pieces of information: a Code, an error
 * message, an optional cause of the error, and an optional collection of
 * arbitrary Protobuf messages called  "details".
 *
 * Because developer tools typically show just the error message, we prefix
 * it with the status code, so that the most important information is always
 * visible immediately.
 *
 * Error details are wrapped with google.protobuf.Any on the wire, so that
 * a server or middleware can attach arbitrary data to an error. Use the
 * method findDetails() to retrieve the details.
 */
class ConnectError extends Error {
    /**
     * Create a new ConnectError.
     * If no code is provided, code "unknown" is used.
     * Outgoing details are only relevant for the server side - a service may
     * raise an error with details, and it is up to the protocol implementation
     * to encode and send the details along with error.
     */
    constructor(message, code = Code.Unknown, metadata, outgoingDetails, cause) {
        super(createMessage(message, code));
        this.name = "ConnectError";
        // see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#example
        Object.setPrototypeOf(this, new.target.prototype);
        this.rawMessage = message;
        this.code = code;
        this.metadata = new Headers(metadata !== null && metadata !== void 0 ? metadata : {});
        this.details = outgoingDetails !== null && outgoingDetails !== void 0 ? outgoingDetails : [];
        this.cause = cause;
    }
    /**
     * Convert any value - typically a caught error into a ConnectError,
     * following these rules:
     * - If the value is already a ConnectError, return it as is.
     * - If the value is an AbortError from the fetch API, return the message
     *   of the AbortError with code Canceled.
     * - For other Errors, return the error message with code Unknown by default.
     * - For other values, return the values String representation as a message,
     *   with the code Unknown by default.
     * The original value will be used for the "cause" property for the new
     * ConnectError.
     */
    static from(reason, code = Code.Unknown) {
        if (reason instanceof ConnectError) {
            return reason;
        }
        if (reason instanceof Error) {
            if (reason.name == "AbortError") {
                // Fetch requests can only be canceled with an AbortController.
                // We detect that condition by looking at the name of the raised
                // error object, and translate to the appropriate status code.
                return new ConnectError(reason.message, Code.Canceled);
            }
            return new ConnectError(reason.message, code, undefined, undefined, reason);
        }
        return new ConnectError(String(reason), code, undefined, undefined, reason);
    }
    static [Symbol.hasInstance](v) {
        if (!(v instanceof Error)) {
            return false;
        }
        if (Object.getPrototypeOf(v) === ConnectError.prototype) {
            return true;
        }
        return (v.name === "ConnectError" &&
            "code" in v &&
            typeof v.code === "number" &&
            "metadata" in v &&
            "details" in v &&
            Array.isArray(v.details) &&
            "rawMessage" in v &&
            typeof v.rawMessage == "string" &&
            "cause" in v);
    }
    findDetails(typeOrRegistry) {
        const registry = typeOrRegistry.kind === "message"
            ? {
                getMessage: (typeName) => typeName === typeOrRegistry.typeName ? typeOrRegistry : undefined,
            }
            : typeOrRegistry;
        const details = [];
        for (const data of this.details) {
            if ("desc" in data) {
                if (registry.getMessage(data.desc.typeName)) {
                    details.push(protobuf.create(data.desc, data.value));
                }
                continue;
            }
            const desc = registry.getMessage(data.type);
            if (desc) {
                try {
                    details.push(protobuf.fromBinary(desc, data.value));
                }
                catch (_) {
                    // We silently give up if we are unable to parse the detail, because
                    // that appears to be the least worst behavior.
                    // It is very unlikely that a user surrounds a catch body handling the
                    // error with another try-catch statement, and we do not want to
                    // recommend doing so.
                }
            }
        }
        return details;
    }
}
/**
 * Create an error message, prefixing the given code.
 */
function createMessage(message, code) {
    return message.length
        ? `[${codeToString(code)}] ${message}`
        : `[${codeToString(code)}]`;
}

// Copyright 2008 Google Inc.  All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
// * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Code generated by the Protocol Buffer compiler is owned by the owner
// of the input file used when generating it.  This code is not
// standalone and requires a support library to be linked with it.  This
// support library is itself covered by the above license.
/**
 * Read a 64 bit varint as two JS numbers.
 *
 * Returns tuple:
 * [0]: low bits
 * [1]: high bits
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L175
 */
function varint64read() {
    let lowBits = 0;
    let highBits = 0;
    for (let shift = 0; shift < 28; shift += 7) {
        let b = this.buf[this.pos++];
        lowBits |= (b & 0x7f) << shift;
        if ((b & 0x80) == 0) {
            this.assertBounds();
            return [lowBits, highBits];
        }
    }
    let middleByte = this.buf[this.pos++];
    // last four bits of the first 32 bit number
    lowBits |= (middleByte & 0x0f) << 28;
    // 3 upper bits are part of the next 32 bit number
    highBits = (middleByte & 0x70) >> 4;
    if ((middleByte & 0x80) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
    }
    for (let shift = 3; shift <= 31; shift += 7) {
        let b = this.buf[this.pos++];
        highBits |= (b & 0x7f) << shift;
        if ((b & 0x80) == 0) {
            this.assertBounds();
            return [lowBits, highBits];
        }
    }
    throw new Error("invalid varint");
}
// constants for binary math
const TWO_PWR_32_DBL = 0x100000000;
/**
 * Parse decimal string of 64 bit integer value as two JS numbers.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
function int64FromString(dec) {
    // Check for minus sign.
    const minus = dec[0] === "-";
    if (minus) {
        dec = dec.slice(1);
    }
    // Work 6 decimal digits at a time, acting like we're converting base 1e6
    // digits to binary. This is safe to do with floating point math because
    // Number.isSafeInteger(ALL_32_BITS * 1e6) == true.
    const base = 1e6;
    let lowBits = 0;
    let highBits = 0;
    function add1e6digit(begin, end) {
        // Note: Number('') is 0.
        const digit1e6 = Number(dec.slice(begin, end));
        highBits *= base;
        lowBits = lowBits * base + digit1e6;
        // Carry bits from lowBits to
        if (lowBits >= TWO_PWR_32_DBL) {
            highBits = highBits + ((lowBits / TWO_PWR_32_DBL) | 0);
            lowBits = lowBits % TWO_PWR_32_DBL;
        }
    }
    add1e6digit(-24, -18);
    add1e6digit(-18, -12);
    add1e6digit(-12, -6);
    add1e6digit(-6);
    return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}
/**
 * Losslessly converts a 64-bit signed integer in 32:32 split representation
 * into a decimal string.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
function int64ToString(lo, hi) {
    let bits = newBits(lo, hi);
    // If we're treating the input as a signed value and the high bit is set, do
    // a manual two's complement conversion before the decimal conversion.
    const negative = bits.hi & 0x80000000;
    if (negative) {
        bits = negate(bits.lo, bits.hi);
    }
    const result = uInt64ToString(bits.lo, bits.hi);
    return negative ? "-" + result : result;
}
/**
 * Losslessly converts a 64-bit unsigned integer in 32:32 split representation
 * into a decimal string.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
function uInt64ToString(lo, hi) {
    ({ lo, hi } = toUnsigned(lo, hi));
    // Skip the expensive conversion if the number is small enough to use the
    // built-in conversions.
    // Number.MAX_SAFE_INTEGER = 0x001FFFFF FFFFFFFF, thus any number with
    // highBits <= 0x1FFFFF can be safely expressed with a double and retain
    // integer precision.
    // Proven by: Number.isSafeInteger(0x1FFFFF * 2**32 + 0xFFFFFFFF) == true.
    if (hi <= 0x1fffff) {
        return String(TWO_PWR_32_DBL * hi + lo);
    }
    // What this code is doing is essentially converting the input number from
    // base-2 to base-1e7, which allows us to represent the 64-bit range with
    // only 3 (very large) digits. Those digits are then trivial to convert to
    // a base-10 string.
    // The magic numbers used here are -
    // 2^24 = 16777216 = (1,6777216) in base-1e7.
    // 2^48 = 281474976710656 = (2,8147497,6710656) in base-1e7.
    // Split 32:32 representation into 16:24:24 representation so our
    // intermediate digits don't overflow.
    const low = lo & 0xffffff;
    const mid = ((lo >>> 24) | (hi << 8)) & 0xffffff;
    const high = (hi >> 16) & 0xffff;
    // Assemble our three base-1e7 digits, ignoring carries. The maximum
    // value in a digit at this step is representable as a 48-bit integer, which
    // can be stored in a 64-bit floating point number.
    let digitA = low + mid * 6777216 + high * 6710656;
    let digitB = mid + high * 8147497;
    let digitC = high * 2;
    // Apply carries from A to B and from B to C.
    const base = 10000000;
    if (digitA >= base) {
        digitB += Math.floor(digitA / base);
        digitA %= base;
    }
    if (digitB >= base) {
        digitC += Math.floor(digitB / base);
        digitB %= base;
    }
    // If digitC is 0, then we should have returned in the trivial code path
    // at the top for non-safe integers. Given this, we can assume both digitB
    // and digitA need leading zeros.
    return (digitC.toString() +
        decimalFrom1e7WithLeadingZeros(digitB) +
        decimalFrom1e7WithLeadingZeros(digitA));
}
function toUnsigned(lo, hi) {
    return { lo: lo >>> 0, hi: hi >>> 0 };
}
function newBits(lo, hi) {
    return { lo: lo | 0, hi: hi | 0 };
}
/**
 * Returns two's compliment negation of input.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Signed_32-bit_integers
 */
function negate(lowBits, highBits) {
    highBits = ~highBits;
    if (lowBits) {
        lowBits = ~lowBits + 1;
    }
    else {
        // If lowBits is 0, then bitwise-not is 0xFFFFFFFF,
        // adding 1 to that, results in 0x100000000, which leaves
        // the low bits 0x0 and simply adds one to the high bits.
        highBits += 1;
    }
    return newBits(lowBits, highBits);
}
/**
 * Returns decimal representation of digit1e7 with leading zeros.
 */
const decimalFrom1e7WithLeadingZeros = (digit1e7) => {
    const partial = String(digit1e7);
    return "0000000".slice(partial.length) + partial;
};
/**
 * Read an unsigned 32 bit varint.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L220
 */
function varint32read() {
    let b = this.buf[this.pos++];
    let result = b & 0x7f;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 0x7f) << 7;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 0x7f) << 14;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 0x7f) << 21;
    if ((b & 0x80) == 0) {
        this.assertBounds();
        return result;
    }
    // Extract only last 4 bits
    b = this.buf[this.pos++];
    result |= (b & 0x0f) << 28;
    for (let readBytes = 5; (b & 0x80) !== 0 && readBytes < 10; readBytes++)
        b = this.buf[this.pos++];
    if ((b & 0x80) != 0)
        throw new Error("invalid varint");
    this.assertBounds();
    // Result can have 32 bits, convert it to unsigned
    return result >>> 0;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Int64Support for the current environment.
 */
const protoInt64 = /*@__PURE__*/ makeInt64Support();
function makeInt64Support() {
    const dv = new DataView(new ArrayBuffer(8));
    // note that Safari 14 implements BigInt, but not the DataView methods
    const ok = typeof BigInt === "function" &&
        typeof dv.getBigInt64 === "function" &&
        typeof dv.getBigUint64 === "function" &&
        typeof dv.setBigInt64 === "function" &&
        typeof dv.setBigUint64 === "function" &&
        (typeof process != "object" ||
            typeof process.env != "object" ||
            process.env.BUF_BIGINT_DISABLE !== "1");
    if (ok) {
        const MIN = BigInt("-9223372036854775808");
        const MAX = BigInt("9223372036854775807");
        const UMIN = BigInt("0");
        const UMAX = BigInt("18446744073709551615");
        return {
            zero: BigInt(0),
            supported: true,
            parse(value) {
                const bi = typeof value == "bigint" ? value : BigInt(value);
                if (bi > MAX || bi < MIN) {
                    throw new Error(`invalid int64: ${value}`);
                }
                return bi;
            },
            uParse(value) {
                const bi = typeof value == "bigint" ? value : BigInt(value);
                if (bi > UMAX || bi < UMIN) {
                    throw new Error(`invalid uint64: ${value}`);
                }
                return bi;
            },
            enc(value) {
                dv.setBigInt64(0, this.parse(value), true);
                return {
                    lo: dv.getInt32(0, true),
                    hi: dv.getInt32(4, true),
                };
            },
            uEnc(value) {
                dv.setBigInt64(0, this.uParse(value), true);
                return {
                    lo: dv.getInt32(0, true),
                    hi: dv.getInt32(4, true),
                };
            },
            dec(lo, hi) {
                dv.setInt32(0, lo, true);
                dv.setInt32(4, hi, true);
                return dv.getBigInt64(0, true);
            },
            uDec(lo, hi) {
                dv.setInt32(0, lo, true);
                dv.setInt32(4, hi, true);
                return dv.getBigUint64(0, true);
            },
        };
    }
    return {
        zero: "0",
        supported: false,
        parse(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertInt64String(value);
            return value;
        },
        uParse(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertUInt64String(value);
            return value;
        },
        enc(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertInt64String(value);
            return int64FromString(value);
        },
        uEnc(value) {
            if (typeof value != "string") {
                value = value.toString();
            }
            assertUInt64String(value);
            return int64FromString(value);
        },
        dec(lo, hi) {
            return int64ToString(lo, hi);
        },
        uDec(lo, hi) {
            return uInt64ToString(lo, hi);
        },
    };
}
function assertInt64String(value) {
    if (!/^-?[0-9]+$/.test(value)) {
        throw new Error("invalid int64: " + value);
    }
}
function assertUInt64String(value) {
    if (!/^[0-9]+$/.test(value)) {
        throw new Error("invalid uint64: " + value);
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const symbol = Symbol.for("@bufbuild/protobuf/text-encoding");
function getTextEncoding() {
    if (globalThis[symbol] == undefined) {
        const te = new globalThis.TextEncoder();
        const td = new globalThis.TextDecoder();
        globalThis[symbol] = {
            encodeUtf8(text) {
                return te.encode(text);
            },
            decodeUtf8(bytes) {
                return td.decode(bytes);
            },
            checkUtf8(text) {
                try {
                    encodeURIComponent(text);
                    return true;
                }
                catch (_) {
                    return false;
                }
            },
        };
    }
    return globalThis[symbol];
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Protobuf binary format wire types.
 *
 * A wire type provides just enough information to find the length of the
 * following value.
 *
 * See https://developers.google.com/protocol-buffers/docs/encoding#structure
 */
var WireType;
(function (WireType) {
    /**
     * Used for int32, int64, uint32, uint64, sint32, sint64, bool, enum
     */
    WireType[WireType["Varint"] = 0] = "Varint";
    /**
     * Used for fixed64, sfixed64, double.
     * Always 8 bytes with little-endian byte order.
     */
    WireType[WireType["Bit64"] = 1] = "Bit64";
    /**
     * Used for string, bytes, embedded messages, packed repeated fields
     *
     * Only repeated numeric types (types which use the varint, 32-bit,
     * or 64-bit wire types) can be packed. In proto3, such fields are
     * packed by default.
     */
    WireType[WireType["LengthDelimited"] = 2] = "LengthDelimited";
    /**
     * Start of a tag-delimited aggregate, such as a proto2 group, or a message
     * in editions with message_encoding = DELIMITED.
     */
    WireType[WireType["StartGroup"] = 3] = "StartGroup";
    /**
     * End of a tag-delimited aggregate.
     */
    WireType[WireType["EndGroup"] = 4] = "EndGroup";
    /**
     * Used for fixed32, sfixed32, float.
     * Always 4 bytes with little-endian byte order.
     */
    WireType[WireType["Bit32"] = 5] = "Bit32";
})(WireType || (WireType = {}));
/**
 * Maximum value for a 32-bit floating point value (Protobuf FLOAT).
 */
const FLOAT32_MAX = 3.4028234663852886e38;
/**
 * Minimum value for a 32-bit floating point value (Protobuf FLOAT).
 */
const FLOAT32_MIN = -34028234663852886e22;
/**
 * Maximum value for an unsigned 32-bit integer (Protobuf UINT32, FIXED32).
 */
const UINT32_MAX = 0xffffffff;
/**
 * Maximum value for a signed 32-bit integer (Protobuf INT32, SFIXED32, SINT32).
 */
const INT32_MAX = 0x7fffffff;
/**
 * Minimum value for a signed 32-bit integer (Protobuf INT32, SFIXED32, SINT32).
 */
const INT32_MIN = -2147483648;
class BinaryReader {
    constructor(buf, decodeUtf8 = getTextEncoding().decodeUtf8) {
        this.decodeUtf8 = decodeUtf8;
        this.varint64 = varint64read; // dirty cast for `this`
        /**
         * Read a `uint32` field, an unsigned 32 bit varint.
         */
        this.uint32 = varint32read;
        this.buf = buf;
        this.len = buf.length;
        this.pos = 0;
        this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    /**
     * Reads a tag - field number and wire type.
     */
    tag() {
        let tag = this.uint32(), fieldNo = tag >>> 3, wireType = tag & 7;
        if (fieldNo <= 0 || wireType < 0 || wireType > 5)
            throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
        return [fieldNo, wireType];
    }
    /**
     * Skip one element and return the skipped data.
     *
     * When skipping StartGroup, provide the tags field number to check for
     * matching field number in the EndGroup tag.
     */
    skip(wireType, fieldNo) {
        let start = this.pos;
        switch (wireType) {
            case WireType.Varint:
                while (this.buf[this.pos++] & 0x80) {
                    // ignore
                }
                break;
            // @ts-expect-error TS7029: Fallthrough case in switch
            case WireType.Bit64:
                this.pos += 4;
            case WireType.Bit32:
                this.pos += 4;
                break;
            case WireType.LengthDelimited:
                let len = this.uint32();
                this.pos += len;
                break;
            case WireType.StartGroup:
                for (;;) {
                    const [fn, wt] = this.tag();
                    if (wt === WireType.EndGroup) {
                        if (fieldNo !== undefined && fn !== fieldNo) {
                            throw new Error("invalid end group tag");
                        }
                        break;
                    }
                    this.skip(wt, fn);
                }
                break;
            default:
                throw new Error("cant skip wire type " + wireType);
        }
        this.assertBounds();
        return this.buf.subarray(start, this.pos);
    }
    /**
     * Throws error if position in byte array is out of range.
     */
    assertBounds() {
        if (this.pos > this.len)
            throw new RangeError("premature EOF");
    }
    /**
     * Read a `int32` field, a signed 32 bit varint.
     */
    int32() {
        return this.uint32() | 0;
    }
    /**
     * Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
     */
    sint32() {
        let zze = this.uint32();
        // decode zigzag
        return (zze >>> 1) ^ -(zze & 1);
    }
    /**
     * Read a `int64` field, a signed 64-bit varint.
     */
    int64() {
        return protoInt64.dec(...this.varint64());
    }
    /**
     * Read a `uint64` field, an unsigned 64-bit varint.
     */
    uint64() {
        return protoInt64.uDec(...this.varint64());
    }
    /**
     * Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
     */
    sint64() {
        let [lo, hi] = this.varint64();
        // decode zig zag
        let s = -(lo & 1);
        lo = ((lo >>> 1) | ((hi & 1) << 31)) ^ s;
        hi = (hi >>> 1) ^ s;
        return protoInt64.dec(lo, hi);
    }
    /**
     * Read a `bool` field, a variant.
     */
    bool() {
        let [lo, hi] = this.varint64();
        return lo !== 0 || hi !== 0;
    }
    /**
     * Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
     */
    fixed32() {
        // biome-ignore lint/suspicious/noAssignInExpressions: no
        return this.view.getUint32((this.pos += 4) - 4, true);
    }
    /**
     * Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
     */
    sfixed32() {
        // biome-ignore lint/suspicious/noAssignInExpressions: no
        return this.view.getInt32((this.pos += 4) - 4, true);
    }
    /**
     * Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
     */
    fixed64() {
        return protoInt64.uDec(this.sfixed32(), this.sfixed32());
    }
    /**
     * Read a `fixed64` field, a signed, fixed-length 64-bit integer.
     */
    sfixed64() {
        return protoInt64.dec(this.sfixed32(), this.sfixed32());
    }
    /**
     * Read a `float` field, 32-bit floating point number.
     */
    float() {
        // biome-ignore lint/suspicious/noAssignInExpressions: no
        return this.view.getFloat32((this.pos += 4) - 4, true);
    }
    /**
     * Read a `double` field, a 64-bit floating point number.
     */
    double() {
        // biome-ignore lint/suspicious/noAssignInExpressions: no
        return this.view.getFloat64((this.pos += 8) - 8, true);
    }
    /**
     * Read a `bytes` field, length-delimited arbitrary data.
     */
    bytes() {
        let len = this.uint32(), start = this.pos;
        this.pos += len;
        this.assertBounds();
        return this.buf.subarray(start, start + len);
    }
    /**
     * Read a `string` field, length-delimited data converted to UTF-8 text.
     */
    string() {
        return this.decodeUtf8(this.bytes());
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Decodes a base64 string to a byte array.
 *
 * - ignores white-space, including line breaks and tabs
 * - allows inner padding (can decode concatenated base64 strings)
 * - does not require padding
 * - understands base64url encoding:
 *   "-" instead of "+",
 *   "_" instead of "/",
 *   no padding
 */
function base64Decode(base64Str) {
    const table = getDecodeTable();
    // estimate byte size, not accounting for inner padding and whitespace
    let es = (base64Str.length * 3) / 4;
    if (base64Str[base64Str.length - 2] == "=")
        es -= 2;
    else if (base64Str[base64Str.length - 1] == "=")
        es -= 1;
    let bytes = new Uint8Array(es), bytePos = 0, // position in byte array
    groupPos = 0, // position in base64 group
    b, // current byte
    p = 0; // previous byte
    for (let i = 0; i < base64Str.length; i++) {
        b = table[base64Str.charCodeAt(i)];
        if (b === undefined) {
            switch (base64Str[i]) {
                // @ts-expect-error TS7029: Fallthrough case in switch
                case "=":
                    groupPos = 0; // reset state when padding found
                case "\n":
                case "\r":
                case "\t":
                case " ":
                    continue; // skip white-space, and padding
                default:
                    throw Error("invalid base64 string");
            }
        }
        switch (groupPos) {
            case 0:
                p = b;
                groupPos = 1;
                break;
            case 1:
                bytes[bytePos++] = (p << 2) | ((b & 48) >> 4);
                p = b;
                groupPos = 2;
                break;
            case 2:
                bytes[bytePos++] = ((p & 15) << 4) | ((b & 60) >> 2);
                p = b;
                groupPos = 3;
                break;
            case 3:
                bytes[bytePos++] = ((p & 3) << 6) | b;
                groupPos = 0;
                break;
        }
    }
    if (groupPos == 1)
        throw Error("invalid base64 string");
    return bytes.subarray(0, bytePos);
}
// lookup table from base64 character to byte
let encodeTableStd;
// lookup table from base64 character *code* to byte because lookup by number is fast
let decodeTable;
function getEncodeTable(encoding) {
    if (!encodeTableStd) {
        encodeTableStd =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
        encodeTableStd.slice(0, -2).concat("-", "_");
    }
    return encodeTableStd;
}
function getDecodeTable() {
    if (!decodeTable) {
        decodeTable = [];
        const encodeTable = getEncodeTable();
        for (let i = 0; i < encodeTable.length; i++)
            decodeTable[encodeTable[i].charCodeAt(0)] = i;
        // support base64url variants
        decodeTable["-".charCodeAt(0)] = encodeTable.indexOf("+");
        decodeTable["_".charCodeAt(0)] = encodeTable.indexOf("/");
    }
    return decodeTable;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Scalar value types. This is a subset of field types declared by protobuf
 * enum google.protobuf.FieldDescriptorProto.Type The types GROUP and MESSAGE
 * are omitted, but the numerical values are identical.
 */
var ScalarType;
(function (ScalarType) {
    // 0 is reserved for errors.
    // Order is weird for historical reasons.
    ScalarType[ScalarType["DOUBLE"] = 1] = "DOUBLE";
    ScalarType[ScalarType["FLOAT"] = 2] = "FLOAT";
    // Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
    // negative values are likely.
    ScalarType[ScalarType["INT64"] = 3] = "INT64";
    ScalarType[ScalarType["UINT64"] = 4] = "UINT64";
    // Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
    // negative values are likely.
    ScalarType[ScalarType["INT32"] = 5] = "INT32";
    ScalarType[ScalarType["FIXED64"] = 6] = "FIXED64";
    ScalarType[ScalarType["FIXED32"] = 7] = "FIXED32";
    ScalarType[ScalarType["BOOL"] = 8] = "BOOL";
    ScalarType[ScalarType["STRING"] = 9] = "STRING";
    // Tag-delimited aggregate.
    // Group type is deprecated and not supported in proto3. However, Proto3
    // implementations should still be able to parse the group wire format and
    // treat group fields as unknown fields.
    // TYPE_GROUP = 10,
    // TYPE_MESSAGE = 11,  // Length-delimited aggregate.
    // New in version 2.
    ScalarType[ScalarType["BYTES"] = 12] = "BYTES";
    ScalarType[ScalarType["UINT32"] = 13] = "UINT32";
    // TYPE_ENUM = 14,
    ScalarType[ScalarType["SFIXED32"] = 15] = "SFIXED32";
    ScalarType[ScalarType["SFIXED64"] = 16] = "SFIXED64";
    ScalarType[ScalarType["SINT32"] = 17] = "SINT32";
    ScalarType[ScalarType["SINT64"] = 18] = "SINT64";
})(ScalarType || (ScalarType = {}));

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Parse an enum value from the Protobuf text format.
 *
 * @private
 */
function parseTextFormatEnumValue(descEnum, value) {
    const enumValue = descEnum.values.find((v) => v.name === value);
    if (!enumValue) {
        throw new Error(`cannot parse ${descEnum} default value: ${value}`);
    }
    return enumValue.number;
}
/**
 * Parse a scalar value from the Protobuf text format.
 *
 * @private
 */
function parseTextFormatScalarValue(type, value) {
    switch (type) {
        case ScalarType.STRING:
            return value;
        case ScalarType.BYTES: {
            const u = unescapeBytesDefaultValue(value);
            if (u === false) {
                throw new Error(`cannot parse ${ScalarType[type]} default value: ${value}`);
            }
            return u;
        }
        case ScalarType.INT64:
        case ScalarType.SFIXED64:
        case ScalarType.SINT64:
            return protoInt64.parse(value);
        case ScalarType.UINT64:
        case ScalarType.FIXED64:
            return protoInt64.uParse(value);
        case ScalarType.DOUBLE:
        case ScalarType.FLOAT:
            switch (value) {
                case "inf":
                    return Number.POSITIVE_INFINITY;
                case "-inf":
                    return Number.NEGATIVE_INFINITY;
                case "nan":
                    return Number.NaN;
                default:
                    return parseFloat(value);
            }
        case ScalarType.BOOL:
            return value === "true";
        case ScalarType.INT32:
        case ScalarType.UINT32:
        case ScalarType.SINT32:
        case ScalarType.FIXED32:
        case ScalarType.SFIXED32:
            return parseInt(value, 10);
    }
}
/**
 * Parses a text-encoded default value (proto2) of a BYTES field.
 */
function unescapeBytesDefaultValue(str) {
    const b = [];
    const input = {
        tail: str,
        c: "",
        next() {
            if (this.tail.length == 0) {
                return false;
            }
            this.c = this.tail[0];
            this.tail = this.tail.substring(1);
            return true;
        },
        take(n) {
            if (this.tail.length >= n) {
                const r = this.tail.substring(0, n);
                this.tail = this.tail.substring(n);
                return r;
            }
            return false;
        },
    };
    while (input.next()) {
        switch (input.c) {
            case "\\":
                if (input.next()) {
                    switch (input.c) {
                        case "\\":
                            b.push(input.c.charCodeAt(0));
                            break;
                        case "b":
                            b.push(0x08);
                            break;
                        case "f":
                            b.push(0x0c);
                            break;
                        case "n":
                            b.push(0x0a);
                            break;
                        case "r":
                            b.push(0x0d);
                            break;
                        case "t":
                            b.push(0x09);
                            break;
                        case "v":
                            b.push(0x0b);
                            break;
                        case "0":
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7": {
                            const s = input.c;
                            const t = input.take(2);
                            if (t === false) {
                                return false;
                            }
                            const n = parseInt(s + t, 8);
                            if (Number.isNaN(n)) {
                                return false;
                            }
                            b.push(n);
                            break;
                        }
                        case "x": {
                            const s = input.c;
                            const t = input.take(2);
                            if (t === false) {
                                return false;
                            }
                            const n = parseInt(s + t, 16);
                            if (Number.isNaN(n)) {
                                return false;
                            }
                            b.push(n);
                            break;
                        }
                        case "u": {
                            const s = input.c;
                            const t = input.take(4);
                            if (t === false) {
                                return false;
                            }
                            const n = parseInt(s + t, 16);
                            if (Number.isNaN(n)) {
                                return false;
                            }
                            const chunk = new Uint8Array(4);
                            const view = new DataView(chunk.buffer);
                            view.setInt32(0, n, true);
                            b.push(chunk[0], chunk[1], chunk[2], chunk[3]);
                            break;
                        }
                        case "U": {
                            const s = input.c;
                            const t = input.take(8);
                            if (t === false) {
                                return false;
                            }
                            const tc = protoInt64.uEnc(s + t);
                            const chunk = new Uint8Array(8);
                            const view = new DataView(chunk.buffer);
                            view.setInt32(0, tc.lo, true);
                            view.setInt32(4, tc.hi, true);
                            b.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
                            break;
                        }
                    }
                }
                break;
            default:
                b.push(input.c.charCodeAt(0));
        }
    }
    return new Uint8Array(b);
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Determine whether the given `arg` is a message.
 * If `desc` is set, determine whether `arg` is this specific message.
 */
function isMessage(arg, schema) {
    const isMessage = arg !== null &&
        typeof arg == "object" &&
        "$typeName" in arg &&
        typeof arg.$typeName == "string";
    if (!isMessage) {
        return false;
    }
    if (schema === undefined) {
        return true;
    }
    return schema.typeName === arg.$typeName;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
class FieldError extends Error {
    constructor(fieldOrOneof, message, name = "FieldValueInvalidError") {
        super(message);
        this.name = name;
        this.field = () => fieldOrOneof;
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Returns the zero value for the given scalar type.
 */
function scalarZeroValue(type, longAsString) {
    switch (type) {
        case ScalarType.STRING:
            return "";
        case ScalarType.BOOL:
            return false;
        case ScalarType.DOUBLE:
        case ScalarType.FLOAT:
            return 0.0;
        case ScalarType.INT64:
        case ScalarType.UINT64:
        case ScalarType.SFIXED64:
        case ScalarType.FIXED64:
        case ScalarType.SINT64:
            return (longAsString ? "0" : protoInt64.zero);
        case ScalarType.BYTES:
            return new Uint8Array(0);
        default:
            // Handles INT32, UINT32, SINT32, FIXED32, SFIXED32.
            // We do not use individual cases to save a few bytes code size.
            return 0;
    }
}
/**
 * Returns true for a zero-value. For example, an integer has the zero-value `0`,
 * a boolean is `false`, a string is `""`, and bytes is an empty Uint8Array.
 *
 * In proto3, zero-values are not written to the wire, unless the field is
 * optional or repeated.
 */
function isScalarZeroValue(type, value) {
    switch (type) {
        case ScalarType.BOOL:
            return value === false;
        case ScalarType.STRING:
            return value === "";
        case ScalarType.BYTES:
            return value instanceof Uint8Array && !value.byteLength;
        default:
            return value == 0; // Loose comparison matches 0n, 0 and "0"
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// bootstrap-inject google.protobuf.FeatureSet.FieldPresence.IMPLICIT: const $name: FeatureSet_FieldPresence.$localName = $number;
const IMPLICIT$2 = 2;
const unsafeLocal = Symbol.for("reflect unsafe local");
/**
 * Return the selected field of a oneof group.
 *
 * @private
 */
function unsafeOneofCase(
// biome-ignore lint/suspicious/noExplicitAny: `any` is the best choice for dynamic access
target, oneof) {
    const c = target[oneof.localName].case;
    if (c === undefined) {
        return c;
    }
    return oneof.fields.find((f) => f.localName === c);
}
/**
 * Returns true if the field is set.
 *
 * @private
 */
function unsafeIsSet(
// biome-ignore lint/suspicious/noExplicitAny: `any` is the best choice for dynamic access
target, field) {
    const name = field.localName;
    if (field.oneof) {
        return target[field.oneof.localName].case === name;
    }
    if (field.presence != IMPLICIT$2) {
        // Fields with explicit presence have properties on the prototype chain
        // for default / zero values (except for proto3).
        return (target[name] !== undefined &&
            Object.prototype.hasOwnProperty.call(target, name));
    }
    switch (field.fieldKind) {
        case "list":
            return target[name].length > 0;
        case "map":
            return Object.keys(target[name]).length > 0;
        case "scalar":
            return !isScalarZeroValue(field.scalar, target[name]);
        case "enum":
            return target[name] !== field.enum.values[0].number;
    }
    throw new Error("message field with implicit presence");
}
/**
 * Returns true if the field is set, but only for singular fields with explicit
 * presence (proto2).
 *
 * @private
 */
function unsafeIsSetExplicit(target, localName) {
    return (Object.prototype.hasOwnProperty.call(target, localName) &&
        target[localName] !== undefined);
}
/**
 * Return a field value, respecting oneof groups.
 *
 * @private
 */
function unsafeGet(target, field) {
    if (field.oneof) {
        const oneof = target[field.oneof.localName];
        if (oneof.case === field.localName) {
            return oneof.value;
        }
        return undefined;
    }
    return target[field.localName];
}
/**
 * Set a field value, respecting oneof groups.
 *
 * @private
 */
function unsafeSet(target, field, value) {
    if (field.oneof) {
        target[field.oneof.localName] = {
            case: field.localName,
            value: value,
        };
    }
    else {
        target[field.localName] = value;
    }
}
/**
 * Resets the field, so that unsafeIsSet() will return false.
 *
 * @private
 */
function unsafeClear(
// biome-ignore lint/suspicious/noExplicitAny: `any` is the best choice for dynamic access
target, field) {
    const name = field.localName;
    if (field.oneof) {
        const oneofLocalName = field.oneof.localName;
        if (target[oneofLocalName].case === name) {
            target[oneofLocalName] = { case: undefined };
        }
    }
    else if (field.presence != IMPLICIT$2) {
        // Fields with explicit presence have properties on the prototype chain
        // for default / zero values (except for proto3). By deleting their own
        // property, the field is reset.
        delete target[name];
    }
    else {
        switch (field.fieldKind) {
            case "map":
                target[name] = {};
                break;
            case "list":
                target[name] = [];
                break;
            case "enum":
                target[name] = field.enum.values[0].number;
                break;
            case "scalar":
                target[name] = scalarZeroValue(field.scalar, field.longAsString);
                break;
        }
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
function isObject(arg) {
    return arg !== null && typeof arg == "object" && !Array.isArray(arg);
}
function isReflectList(arg, field) {
    var _a, _b, _c, _d;
    if (isObject(arg) &&
        unsafeLocal in arg &&
        "add" in arg &&
        "field" in arg &&
        typeof arg.field == "function") {
        if (field !== undefined) {
            const a = field;
            const b = arg.field();
            return (a.listKind == b.listKind &&
                a.scalar === b.scalar &&
                ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) &&
                ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName));
        }
        return true;
    }
    return false;
}
function isReflectMap(arg, field) {
    var _a, _b, _c, _d;
    if (isObject(arg) &&
        unsafeLocal in arg &&
        "has" in arg &&
        "field" in arg &&
        typeof arg.field == "function") {
        if (field !== undefined) {
            const a = field, b = arg.field();
            return (a.mapKey === b.mapKey &&
                a.mapKind == b.mapKind &&
                a.scalar === b.scalar &&
                ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) &&
                ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName));
        }
        return true;
    }
    return false;
}
function isReflectMessage(arg, messageDesc) {
    return (isObject(arg) &&
        unsafeLocal in arg &&
        "desc" in arg &&
        isObject(arg.desc) &&
        arg.desc.kind === "message" &&
        (messageDesc === undefined || arg.desc.typeName == messageDesc.typeName));
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Check whether the given field value is valid for the reflect API.
 */
function checkField(field, value) {
    const check = field.fieldKind == "list"
        ? isReflectList(value, field)
        : field.fieldKind == "map"
            ? isReflectMap(value, field)
            : checkSingular(field, value);
    if (check === true) {
        return undefined;
    }
    let reason;
    switch (field.fieldKind) {
        case "list":
            reason = `expected ${formatReflectList(field)}, got ${formatVal(value)}`;
            break;
        case "map":
            reason = `expected ${formatReflectMap(field)}, got ${formatVal(value)}`;
            break;
        default: {
            reason = reasonSingular(field, value, check);
        }
    }
    return new FieldError(field, reason);
}
/**
 * Check whether the given list item is valid for the reflect API.
 */
function checkListItem(field, index, value) {
    const check = checkSingular(field, value);
    if (check !== true) {
        return new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
    }
    return undefined;
}
/**
 * Check whether the given map key and value are valid for the reflect API.
 */
function checkMapEntry(field, key, value) {
    const checkKey = checkScalarValue(key, field.mapKey);
    if (checkKey !== true) {
        return new FieldError(field, `invalid map key: ${reasonSingular({ scalar: field.mapKey }, key, checkKey)}`);
    }
    const checkVal = checkSingular(field, value);
    if (checkVal !== true) {
        return new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, checkVal)}`);
    }
    return undefined;
}
function checkSingular(field, value) {
    if (field.scalar !== undefined) {
        return checkScalarValue(value, field.scalar);
    }
    if (field.enum !== undefined) {
        if (field.enum.open) {
            return Number.isInteger(value);
        }
        return field.enum.values.some((v) => v.number === value);
    }
    return isReflectMessage(value, field.message);
}
function checkScalarValue(value, scalar) {
    switch (scalar) {
        case ScalarType.DOUBLE:
            return typeof value == "number";
        case ScalarType.FLOAT:
            if (typeof value != "number") {
                return false;
            }
            if (Number.isNaN(value) || !Number.isFinite(value)) {
                return true;
            }
            if (value > FLOAT32_MAX || value < FLOAT32_MIN) {
                return `${value.toFixed()} out of range`;
            }
            return true;
        case ScalarType.INT32:
        case ScalarType.SFIXED32:
        case ScalarType.SINT32:
            // signed
            if (typeof value !== "number" || !Number.isInteger(value)) {
                return false;
            }
            if (value > INT32_MAX || value < INT32_MIN) {
                return `${value.toFixed()} out of range`;
            }
            return true;
        case ScalarType.FIXED32:
        case ScalarType.UINT32:
            // unsigned
            if (typeof value !== "number" || !Number.isInteger(value)) {
                return false;
            }
            if (value > UINT32_MAX || value < 0) {
                return `${value.toFixed()} out of range`;
            }
            return true;
        case ScalarType.BOOL:
            return typeof value == "boolean";
        case ScalarType.STRING:
            if (typeof value != "string") {
                return false;
            }
            return getTextEncoding().checkUtf8(value) || "invalid UTF8";
        case ScalarType.BYTES:
            return value instanceof Uint8Array;
        case ScalarType.INT64:
        case ScalarType.SFIXED64:
        case ScalarType.SINT64:
            // signed
            if (typeof value == "bigint" ||
                typeof value == "number" ||
                (typeof value == "string" && value.length > 0)) {
                try {
                    protoInt64.parse(value);
                    return true;
                }
                catch (_) {
                    return `${value} out of range`;
                }
            }
            return false;
        case ScalarType.FIXED64:
        case ScalarType.UINT64:
            // unsigned
            if (typeof value == "bigint" ||
                typeof value == "number" ||
                (typeof value == "string" && value.length > 0)) {
                try {
                    protoInt64.uParse(value);
                    return true;
                }
                catch (_) {
                    return `${value} out of range`;
                }
            }
            return false;
    }
}
function reasonSingular(field, val, details) {
    details =
        typeof details == "string" ? `: ${details}` : `, got ${formatVal(val)}`;
    if (field.scalar !== undefined) {
        return `expected ${scalarTypeDescription(field.scalar)}` + details;
    }
    if (field.enum !== undefined) {
        return `expected ${field.enum.toString()}` + details;
    }
    return `expected ${formatReflectMessage(field.message)}` + details;
}
function formatVal(val) {
    switch (typeof val) {
        case "object":
            if (val === null) {
                return "null";
            }
            if (val instanceof Uint8Array) {
                return `Uint8Array(${val.length})`;
            }
            if (Array.isArray(val)) {
                return `Array(${val.length})`;
            }
            if (isReflectList(val)) {
                return formatReflectList(val.field());
            }
            if (isReflectMap(val)) {
                return formatReflectMap(val.field());
            }
            if (isReflectMessage(val)) {
                return formatReflectMessage(val.desc);
            }
            if (isMessage(val)) {
                return `message ${val.$typeName}`;
            }
            return "object";
        case "string":
            return val.length > 30 ? "string" : `"${val.split('"').join('\\"')}"`;
        case "boolean":
            return String(val);
        case "number":
            return String(val);
        case "bigint":
            return String(val) + "n";
        default:
            // "symbol" | "undefined" | "object" | "function"
            return typeof val;
    }
}
function formatReflectMessage(desc) {
    return `ReflectMessage (${desc.typeName})`;
}
function formatReflectList(field) {
    switch (field.listKind) {
        case "message":
            return `ReflectList (${field.message.toString()})`;
        case "enum":
            return `ReflectList (${field.enum.toString()})`;
        case "scalar":
            return `ReflectList (${ScalarType[field.scalar]})`;
    }
}
function formatReflectMap(field) {
    switch (field.mapKind) {
        case "message":
            return `ReflectMap (${ScalarType[field.mapKey]}, ${field.message.toString()})`;
        case "enum":
            return `ReflectMap (${ScalarType[field.mapKey]}, ${field.enum.toString()})`;
        case "scalar":
            return `ReflectMap (${ScalarType[field.mapKey]}, ${ScalarType[field.scalar]})`;
    }
}
function scalarTypeDescription(scalar) {
    switch (scalar) {
        case ScalarType.STRING:
            return "string";
        case ScalarType.BOOL:
            return "boolean";
        case ScalarType.INT64:
        case ScalarType.SINT64:
        case ScalarType.SFIXED64:
            return "bigint (int64)";
        case ScalarType.UINT64:
        case ScalarType.FIXED64:
            return "bigint (uint64)";
        case ScalarType.BYTES:
            return "Uint8Array";
        case ScalarType.DOUBLE:
            return "number (float64)";
        case ScalarType.FLOAT:
            return "number (float32)";
        case ScalarType.FIXED32:
        case ScalarType.UINT32:
            return "number (uint32)";
        case ScalarType.INT32:
        case ScalarType.SFIXED32:
        case ScalarType.SINT32:
            return "number (int32)";
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
function isWrapper(arg) {
    return isWrapperTypeName(arg.$typeName);
}
function isWrapperDesc(messageDesc) {
    const f = messageDesc.fields[0];
    return (isWrapperTypeName(messageDesc.typeName) &&
        f !== undefined &&
        f.fieldKind == "scalar" &&
        f.name == "value" &&
        f.number == 1);
}
function isWrapperTypeName(name) {
    return (name.startsWith("google.protobuf.") &&
        [
            "DoubleValue",
            "FloatValue",
            "Int64Value",
            "UInt64Value",
            "Int32Value",
            "UInt32Value",
            "BoolValue",
            "StringValue",
            "BytesValue",
        ].includes(name.substring(16)));
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// bootstrap-inject google.protobuf.Edition.EDITION_PROTO3: const $name: Edition.$localName = $number;
const EDITION_PROTO3$1 = 999;
// bootstrap-inject google.protobuf.Edition.EDITION_PROTO2: const $name: Edition.$localName = $number;
const EDITION_PROTO2$1 = 998;
// bootstrap-inject google.protobuf.FeatureSet.FieldPresence.IMPLICIT: const $name: FeatureSet_FieldPresence.$localName = $number;
const IMPLICIT$1 = 2;
/**
 * Create a new message instance.
 *
 * The second argument is an optional initializer object, where all fields are
 * optional.
 */
function create(schema, init) {
    if (isMessage(init, schema)) {
        return init;
    }
    const message = createZeroMessage(schema);
    return message;
}
const tokenZeroMessageField = Symbol();
const messagePrototypes = new WeakMap();
/**
 * Create a zero message.
 */
function createZeroMessage(desc) {
    let msg;
    if (!needsPrototypeChain(desc)) {
        msg = {
            $typeName: desc.typeName,
        };
        for (const member of desc.members) {
            if (member.kind == "oneof" || member.presence == IMPLICIT$1) {
                msg[member.localName] = createZeroField(member);
            }
        }
    }
    else {
        // Support default values and track presence via the prototype chain
        const cached = messagePrototypes.get(desc);
        let prototype;
        let members;
        if (cached) {
            ({ prototype, members } = cached);
        }
        else {
            prototype = {};
            members = new Set();
            for (const member of desc.members) {
                if (member.kind == "oneof") {
                    // we can only put immutable values on the prototype,
                    // oneof ADTs are mutable
                    continue;
                }
                if (member.fieldKind != "scalar" && member.fieldKind != "enum") {
                    // only scalar and enum values are immutable, map, list, and message
                    // are not
                    continue;
                }
                if (member.presence == IMPLICIT$1) {
                    // implicit presence tracks field presence by zero values - e.g. 0, false, "", are unset, 1, true, "x" are set.
                    // message, map, list fields are mutable, and also have IMPLICIT presence.
                    continue;
                }
                members.add(member);
                prototype[member.localName] = createZeroField(member);
            }
            messagePrototypes.set(desc, { prototype, members });
        }
        msg = Object.create(prototype);
        msg.$typeName = desc.typeName;
        for (const member of desc.members) {
            if (members.has(member)) {
                continue;
            }
            if (member.kind == "field") {
                if (member.fieldKind == "message") {
                    continue;
                }
                if (member.fieldKind == "scalar" || member.fieldKind == "enum") {
                    if (member.presence != IMPLICIT$1) {
                        continue;
                    }
                }
            }
            msg[member.localName] = createZeroField(member);
        }
    }
    return msg;
}
/**
 * Do we need the prototype chain to track field presence?
 */
function needsPrototypeChain(desc) {
    switch (desc.file.edition) {
        case EDITION_PROTO3$1:
            // proto3 always uses implicit presence, we never need the prototype chain.
            return false;
        case EDITION_PROTO2$1:
            // proto2 never uses implicit presence, we always need the prototype chain.
            return true;
        default:
            // If a message uses scalar or enum fields with explicit presence, we need
            // the prototype chain to track presence. This rule does not apply to fields
            // in a oneof group - they use a different mechanism to track presence.
            return desc.fields.some((f) => f.presence != IMPLICIT$1 && f.fieldKind != "message" && !f.oneof);
    }
}
/**
 * Returns a zero value for oneof groups, and for every field kind except
 * messages. Scalar and enum fields can have default values.
 */
function createZeroField(field) {
    if (field.kind == "oneof") {
        return { case: undefined };
    }
    if (field.fieldKind == "list") {
        return [];
    }
    if (field.fieldKind == "map") {
        return {}; // Object.create(null) would be desirable here, but is unsupported by react https://react.dev/reference/react/use-server#serializable-parameters-and-return-values
    }
    if (field.fieldKind == "message") {
        return tokenZeroMessageField;
    }
    const defaultValue = field.getDefaultValue();
    if (defaultValue !== undefined) {
        return field.fieldKind == "scalar" && field.longAsString
            ? defaultValue.toString()
            : defaultValue;
    }
    return field.fieldKind == "scalar"
        ? scalarZeroValue(field.scalar, field.longAsString)
        : field.enum.values[0].number;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Create a ReflectMessage.
 */
function reflect(messageDesc, message, 
/**
 * By default, field values are validated when setting them. For example,
 * a value for an uint32 field must be a ECMAScript Number >= 0.
 *
 * When field values are trusted, performance can be improved by disabling
 * checks.
 */
check = true) {
    return new ReflectMessageImpl(messageDesc, message, check);
}
class ReflectMessageImpl {
    get sortedFields() {
        var _a;
        return ((_a = this._sortedFields) !== null && _a !== void 0 ? _a : 
        // biome-ignore lint/suspicious/noAssignInExpressions: no
        (this._sortedFields = this.desc.fields
            .concat()
            .sort((a, b) => a.number - b.number)));
    }
    constructor(messageDesc, message, check = true) {
        this.lists = new Map();
        this.maps = new Map();
        this.check = check;
        this.desc = messageDesc;
        this.message = this[unsafeLocal] = message !== null && message !== void 0 ? message : create(messageDesc);
        this.fields = messageDesc.fields;
        this.oneofs = messageDesc.oneofs;
        this.members = messageDesc.members;
    }
    findNumber(number) {
        if (!this._fieldsByNumber) {
            this._fieldsByNumber = new Map(this.desc.fields.map((f) => [f.number, f]));
        }
        return this._fieldsByNumber.get(number);
    }
    oneofCase(oneof) {
        assertOwn(this.message, oneof);
        return unsafeOneofCase(this.message, oneof);
    }
    isSet(field) {
        assertOwn(this.message, field);
        return unsafeIsSet(this.message, field);
    }
    clear(field) {
        assertOwn(this.message, field);
        unsafeClear(this.message, field);
    }
    get(field) {
        assertOwn(this.message, field);
        const value = unsafeGet(this.message, field);
        switch (field.fieldKind) {
            case "list":
                // eslint-disable-next-line no-case-declarations
                let list = this.lists.get(field);
                if (!list || list[unsafeLocal] !== value) {
                    this.lists.set(field, 
                    // biome-ignore lint/suspicious/noAssignInExpressions: no
                    (list = new ReflectListImpl(field, value, this.check)));
                }
                return list;
            case "map":
                let map = this.maps.get(field);
                if (!map || map[unsafeLocal] !== value) {
                    this.maps.set(field, 
                    // biome-ignore lint/suspicious/noAssignInExpressions: no
                    (map = new ReflectMapImpl(field, value, this.check)));
                }
                return map;
            case "message":
                return messageToReflect(field, value, this.check);
            case "scalar":
                return (value === undefined
                    ? scalarZeroValue(field.scalar, false)
                    : longToReflect(field, value));
            case "enum":
                return (value !== null && value !== void 0 ? value : field.enum.values[0].number);
        }
    }
    set(field, value) {
        assertOwn(this.message, field);
        if (this.check) {
            const err = checkField(field, value);
            if (err) {
                throw err;
            }
        }
        let local;
        if (field.fieldKind == "message") {
            local = messageToLocal(field, value);
        }
        else if (isReflectMap(value) || isReflectList(value)) {
            local = value[unsafeLocal];
        }
        else {
            local = longToLocal(field, value);
        }
        unsafeSet(this.message, field, local);
    }
    getUnknown() {
        return this.message.$unknown;
    }
    setUnknown(value) {
        this.message.$unknown = value;
    }
}
function assertOwn(owner, member) {
    if (member.parent.typeName !== owner.$typeName) {
        throw new FieldError(member, `cannot use ${member.toString()} with message ${owner.$typeName}`, "ForeignFieldError");
    }
}
class ReflectListImpl {
    field() {
        return this._field;
    }
    get size() {
        return this._arr.length;
    }
    constructor(field, unsafeInput, check) {
        this._field = field;
        this._arr = this[unsafeLocal] = unsafeInput;
        this.check = check;
    }
    get(index) {
        const item = this._arr[index];
        return item === undefined
            ? undefined
            : listItemToReflect(this._field, item, this.check);
    }
    set(index, item) {
        if (index < 0 || index >= this._arr.length) {
            throw new FieldError(this._field, `list item #${index + 1}: out of range`);
        }
        if (this.check) {
            const err = checkListItem(this._field, index, item);
            if (err) {
                throw err;
            }
        }
        this._arr[index] = listItemToLocal(this._field, item);
    }
    add(item) {
        if (this.check) {
            const err = checkListItem(this._field, this._arr.length, item);
            if (err) {
                throw err;
            }
        }
        this._arr.push(listItemToLocal(this._field, item));
        return undefined;
    }
    clear() {
        this._arr.splice(0, this._arr.length);
    }
    [Symbol.iterator]() {
        return this.values();
    }
    keys() {
        return this._arr.keys();
    }
    *values() {
        for (const item of this._arr) {
            yield listItemToReflect(this._field, item, this.check);
        }
    }
    *entries() {
        for (let i = 0; i < this._arr.length; i++) {
            yield [i, listItemToReflect(this._field, this._arr[i], this.check)];
        }
    }
}
class ReflectMapImpl {
    constructor(field, unsafeInput, check = true) {
        this.obj = this[unsafeLocal] = unsafeInput !== null && unsafeInput !== void 0 ? unsafeInput : {};
        this.check = check;
        this._field = field;
    }
    field() {
        return this._field;
    }
    set(key, value) {
        if (this.check) {
            const err = checkMapEntry(this._field, key, value);
            if (err) {
                throw err;
            }
        }
        this.obj[mapKeyToLocal(key)] = mapValueToLocal(this._field, value);
        return this;
    }
    delete(key) {
        const k = mapKeyToLocal(key);
        const has = Object.prototype.hasOwnProperty.call(this.obj, k);
        if (has) {
            delete this.obj[k];
        }
        return has;
    }
    clear() {
        for (const key of Object.keys(this.obj)) {
            delete this.obj[key];
        }
    }
    get(key) {
        let val = this.obj[mapKeyToLocal(key)];
        if (val !== undefined) {
            val = mapValueToReflect(this._field, val, this.check);
        }
        return val;
    }
    has(key) {
        return Object.prototype.hasOwnProperty.call(this.obj, mapKeyToLocal(key));
    }
    *keys() {
        for (const objKey of Object.keys(this.obj)) {
            yield mapKeyToReflect(objKey, this._field.mapKey);
        }
    }
    *entries() {
        for (const objEntry of Object.entries(this.obj)) {
            yield [
                mapKeyToReflect(objEntry[0], this._field.mapKey),
                mapValueToReflect(this._field, objEntry[1], this.check),
            ];
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    get size() {
        return Object.keys(this.obj).length;
    }
    *values() {
        for (const val of Object.values(this.obj)) {
            yield mapValueToReflect(this._field, val, this.check);
        }
    }
    forEach(callbackfn, thisArg) {
        for (const mapEntry of this.entries()) {
            callbackfn.call(thisArg, mapEntry[1], mapEntry[0], this);
        }
    }
}
function messageToLocal(field, value) {
    if (!isReflectMessage(value)) {
        return value;
    }
    if (isWrapper(value.message) &&
        !field.oneof &&
        field.fieldKind == "message") {
        // Types from google/protobuf/wrappers.proto are unwrapped when used in
        // a singular field that is not part of a oneof group.
        return value.message.value;
    }
    if (value.desc.typeName == "google.protobuf.Struct" &&
        field.parent.typeName != "google.protobuf.Value") {
        // google.protobuf.Struct is represented with JsonObject when used in a
        // field, except when used in google.protobuf.Value.
        return wktStructToLocal(value.message);
    }
    return value.message;
}
function messageToReflect(field, value, check) {
    if (value !== undefined) {
        if (isWrapperDesc(field.message) &&
            !field.oneof &&
            field.fieldKind == "message") {
            // Types from google/protobuf/wrappers.proto are unwrapped when used in
            // a singular field that is not part of a oneof group.
            value = {
                $typeName: field.message.typeName,
                value: longToReflect(field.message.fields[0], value),
            };
        }
        else if (field.message.typeName == "google.protobuf.Struct" &&
            field.parent.typeName != "google.protobuf.Value" &&
            isObject(value)) {
            // google.protobuf.Struct is represented with JsonObject when used in a
            // field, except when used in google.protobuf.Value.
            value = wktStructToReflect(value);
        }
    }
    return new ReflectMessageImpl(field.message, value, check);
}
function listItemToLocal(field, value) {
    if (field.listKind == "message") {
        return messageToLocal(field, value);
    }
    return longToLocal(field, value);
}
function listItemToReflect(field, value, check) {
    if (field.listKind == "message") {
        return messageToReflect(field, value, check);
    }
    return longToReflect(field, value);
}
function mapValueToLocal(field, value) {
    if (field.mapKind == "message") {
        return messageToLocal(field, value);
    }
    return longToLocal(field, value);
}
function mapValueToReflect(field, value, check) {
    if (field.mapKind == "message") {
        return messageToReflect(field, value, check);
    }
    return value;
}
function mapKeyToLocal(key) {
    return typeof key == "string" || typeof key == "number" ? key : String(key);
}
/**
 * Converts a map key (any scalar value except float, double, or bytes) from its
 * representation in a message (string or number, the only possible object key
 * types) to the closest possible type in ECMAScript.
 */
function mapKeyToReflect(key, type) {
    switch (type) {
        case ScalarType.STRING:
            return key;
        case ScalarType.INT32:
        case ScalarType.FIXED32:
        case ScalarType.UINT32:
        case ScalarType.SFIXED32:
        case ScalarType.SINT32: {
            const n = Number.parseInt(key);
            if (Number.isFinite(n)) {
                return n;
            }
            break;
        }
        case ScalarType.BOOL:
            switch (key) {
                case "true":
                    return true;
                case "false":
                    return false;
            }
            break;
        case ScalarType.UINT64:
        case ScalarType.FIXED64:
            try {
                return protoInt64.uParse(key);
            }
            catch (_a) {
                //
            }
            break;
        default:
            // INT64, SFIXED64, SINT64
            try {
                return protoInt64.parse(key);
            }
            catch (_b) {
                //
            }
            break;
    }
    return key;
}
function longToReflect(field, value) {
    switch (field.scalar) {
        case ScalarType.INT64:
        case ScalarType.SFIXED64:
        case ScalarType.SINT64:
            if ("longAsString" in field &&
                field.longAsString &&
                typeof value == "string") {
                value = protoInt64.parse(value);
            }
            break;
        case ScalarType.FIXED64:
        case ScalarType.UINT64:
            if ("longAsString" in field &&
                field.longAsString &&
                typeof value == "string") {
                value = protoInt64.uParse(value);
            }
            break;
    }
    return value;
}
function longToLocal(field, value) {
    switch (field.scalar) {
        case ScalarType.INT64:
        case ScalarType.SFIXED64:
        case ScalarType.SINT64:
            if ("longAsString" in field && field.longAsString) {
                value = String(value);
            }
            else if (typeof value == "string" || typeof value == "number") {
                value = protoInt64.parse(value);
            }
            break;
        case ScalarType.FIXED64:
        case ScalarType.UINT64:
            if ("longAsString" in field && field.longAsString) {
                value = String(value);
            }
            else if (typeof value == "string" || typeof value == "number") {
                value = protoInt64.uParse(value);
            }
            break;
    }
    return value;
}
function wktStructToReflect(json) {
    const struct = {
        $typeName: "google.protobuf.Struct",
        fields: {},
    };
    if (isObject(json)) {
        for (const [k, v] of Object.entries(json)) {
            struct.fields[k] = wktValueToReflect(v);
        }
    }
    return struct;
}
function wktStructToLocal(val) {
    const json = {};
    for (const [k, v] of Object.entries(val.fields)) {
        json[k] = wktValueToLocal(v);
    }
    return json;
}
function wktValueToLocal(val) {
    switch (val.kind.case) {
        case "structValue":
            return wktStructToLocal(val.kind.value);
        case "listValue":
            return val.kind.value.values.map(wktValueToLocal);
        case "nullValue":
        case undefined:
            return null;
        default:
            return val.kind.value;
    }
}
function wktValueToReflect(json) {
    const value = {
        $typeName: "google.protobuf.Value",
        kind: { case: undefined },
    };
    switch (typeof json) {
        case "number":
            value.kind = { case: "numberValue", value: json };
            break;
        case "string":
            value.kind = { case: "stringValue", value: json };
            break;
        case "boolean":
            value.kind = { case: "boolValue", value: json };
            break;
        case "object":
            if (json === null) {
                const nullValue = 0;
                value.kind = { case: "nullValue", value: nullValue };
            }
            else if (Array.isArray(json)) {
                const listValue = {
                    $typeName: "google.protobuf.ListValue",
                    values: [],
                };
                if (Array.isArray(json)) {
                    for (const e of json) {
                        listValue.values.push(wktValueToReflect(e));
                    }
                }
                value.kind = {
                    case: "listValue",
                    value: listValue,
                };
            }
            else {
                value.kind = {
                    case: "structValue",
                    value: wktStructToReflect(json),
                };
            }
            break;
    }
    return value;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// Default options for parsing binary data.
const readDefaults = {
    readUnknownFields: true,
};
function makeReadOptions(options) {
    return options ? Object.assign(Object.assign({}, readDefaults), options) : readDefaults;
}
/**
 * Parse serialized binary data.
 */
function fromBinary(schema, bytes, options) {
    const msg = reflect(schema, undefined, false);
    readMessage(msg, new BinaryReader(bytes), makeReadOptions(options), false, bytes.byteLength);
    return msg.message;
}
/**
 * If `delimited` is false, read the length given in `lengthOrDelimitedFieldNo`.
 *
 * If `delimited` is true, read until an EndGroup tag. `lengthOrDelimitedFieldNo`
 * is the expected field number.
 *
 * @private
 */
function readMessage(message, reader, options, delimited, lengthOrDelimitedFieldNo) {
    var _a;
    const end = delimited ? reader.len : reader.pos + lengthOrDelimitedFieldNo;
    let fieldNo;
    let wireType;
    const unknownFields = (_a = message.getUnknown()) !== null && _a !== void 0 ? _a : [];
    while (reader.pos < end) {
        [fieldNo, wireType] = reader.tag();
        if (delimited && wireType == WireType.EndGroup) {
            break;
        }
        const field = message.findNumber(fieldNo);
        if (!field) {
            const data = reader.skip(wireType, fieldNo);
            if (options.readUnknownFields) {
                unknownFields.push({ no: fieldNo, wireType, data });
            }
            continue;
        }
        readField(message, reader, field, wireType, options);
    }
    if (delimited) {
        if (wireType != WireType.EndGroup || fieldNo !== lengthOrDelimitedFieldNo) {
            throw new Error("invalid end group tag");
        }
    }
    if (unknownFields.length > 0) {
        message.setUnknown(unknownFields);
    }
}
/**
 * @private
 */
function readField(message, reader, field, wireType, options) {
    switch (field.fieldKind) {
        case "scalar":
            message.set(field, readScalar(reader, field.scalar));
            break;
        case "enum":
            message.set(field, readScalar(reader, ScalarType.INT32));
            break;
        case "message":
            message.set(field, readMessageField(reader, options, field, message.get(field)));
            break;
        case "list":
            readListField(reader, wireType, message.get(field), options);
            break;
        case "map":
            readMapEntry(reader, message.get(field), options);
            break;
    }
}
// Read a map field, expecting key field = 1, value field = 2
function readMapEntry(reader, map, options) {
    const field = map.field();
    let key;
    let val;
    const end = reader.pos + reader.uint32();
    while (reader.pos < end) {
        const [fieldNo] = reader.tag();
        switch (fieldNo) {
            case 1:
                key = readScalar(reader, field.mapKey);
                break;
            case 2:
                switch (field.mapKind) {
                    case "scalar":
                        val = readScalar(reader, field.scalar);
                        break;
                    case "enum":
                        val = reader.int32();
                        break;
                    case "message":
                        val = readMessageField(reader, options, field);
                        break;
                }
                break;
        }
    }
    if (key === undefined) {
        key = scalarZeroValue(field.mapKey, false);
    }
    if (val === undefined) {
        switch (field.mapKind) {
            case "scalar":
                val = scalarZeroValue(field.scalar, false);
                break;
            case "enum":
                val = field.enum.values[0].number;
                break;
            case "message":
                val = reflect(field.message, undefined, false);
                break;
        }
    }
    map.set(key, val);
}
function readListField(reader, wireType, list, options) {
    var _a;
    const field = list.field();
    if (field.listKind === "message") {
        list.add(readMessageField(reader, options, field));
        return;
    }
    const scalarType = (_a = field.scalar) !== null && _a !== void 0 ? _a : ScalarType.INT32;
    const packed = wireType == WireType.LengthDelimited &&
        scalarType != ScalarType.STRING &&
        scalarType != ScalarType.BYTES;
    if (!packed) {
        list.add(readScalar(reader, scalarType));
        return;
    }
    const e = reader.uint32() + reader.pos;
    while (reader.pos < e) {
        list.add(readScalar(reader, scalarType));
    }
}
function readMessageField(reader, options, field, mergeMessage) {
    const delimited = field.delimitedEncoding;
    const message = mergeMessage !== null && mergeMessage !== void 0 ? mergeMessage : reflect(field.message, undefined, false);
    readMessage(message, reader, options, delimited, delimited ? field.number : reader.uint32());
    return message;
}
function readScalar(reader, type) {
    switch (type) {
        case ScalarType.STRING:
            return reader.string();
        case ScalarType.BOOL:
            return reader.bool();
        case ScalarType.DOUBLE:
            return reader.double();
        case ScalarType.FLOAT:
            return reader.float();
        case ScalarType.INT32:
            return reader.int32();
        case ScalarType.INT64:
            return reader.int64();
        case ScalarType.UINT64:
            return reader.uint64();
        case ScalarType.FIXED64:
            return reader.fixed64();
        case ScalarType.BYTES:
            return reader.bytes();
        case ScalarType.FIXED32:
            return reader.fixed32();
        case ScalarType.SFIXED32:
            return reader.sfixed32();
        case ScalarType.SFIXED64:
            return reader.sfixed64();
        case ScalarType.SINT64:
            return reader.sint64();
        case ScalarType.UINT32:
            return reader.uint32();
        case ScalarType.SINT32:
            return reader.sint32();
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
function decodeBinaryHeader(value, desc, options) {
    try {
        const bytes = base64Decode(value);
        if (desc) {
            return protobuf.fromBinary(desc, bytes, options);
        }
        return bytes;
    }
    catch (e) {
        throw ConnectError.from(e, Code.DataLoss);
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Create any client for the given service.
 *
 * The given createMethod function is called for each method definition
 * of the service. The function it returns is added to the client object
 * as a method.
 */
function makeAnyClient(service, createMethod) {
    const client = {};
    for (const desc of service.methods) {
        const method = createMethod(desc);
        if (method != null) {
            client[desc.localName] = method;
        }
    }
    return client;
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * compressedFlag indicates that the data in a EnvelopedMessage is
 * compressed. It has the same meaning in the gRPC-Web, gRPC-HTTP2,
 * and Connect protocols.
 *
 * @private Internal code, does not follow semantic versioning.
 */
const compressedFlag = 0b00000001;

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Compress an EnvelopedMessage.
 *
 * Raises Internal if an enveloped message is already compressed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function envelopeCompress(envelope, compression, compressMinBytes) {
    let { flags, data } = envelope;
    if ((flags & compressedFlag) === compressedFlag) {
        throw new ConnectError("invalid envelope, already compressed", Code.Internal);
    }
    if (compression && data.byteLength >= compressMinBytes) {
        data = await compression.compress(data);
        flags = flags | compressedFlag;
    }
    return { data, flags };
}
/**
 * Decompress an EnvelopedMessage.
 *
 * Raises InvalidArgument if an envelope is compressed, but compression is null.
 *
 * Relies on the provided Compression to raise ResourceExhausted if the
 * *decompressed* message size is larger than readMaxBytes. If the envelope is
 * not compressed, readMaxBytes is not honored.
 *
 * @private Internal code, does not follow semantic versioning.
 */
async function envelopeDecompress(envelope, compression, readMaxBytes) {
    let { flags, data } = envelope;
    if ((flags & compressedFlag) === compressedFlag) {
        if (!compression) {
            throw new ConnectError("received compressed envelope, but do not know how to decompress", Code.Internal);
        }
        data = await compression.decompress(data, readMaxBytes);
        flags = flags ^ compressedFlag;
    }
    return { data, flags };
}
/**
 * Encode a single enveloped message.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function encodeEnvelope(flags, data) {
    const bytes = new Uint8Array(data.length + 5);
    bytes.set(data, 5);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    v.setUint8(0, flags); // first byte is flags
    v.setUint32(1, data.length); // 4 bytes message length
    return bytes;
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * At most, allow ~4GiB to be received or sent per message.
 * zlib used by Node.js caps maxOutputLength at this value. It also happens to
 * be the maximum theoretical message size supported by protobuf-es.
 */
const maxReadMaxBytes = 0xffffffff;
const maxWriteMaxBytes = maxReadMaxBytes;
/**
 * The default value for the compressMinBytes option. The CPU cost of compressing
 * very small messages usually isn't worth the small reduction in network I/O, so
 * the default value is 1 kibibyte.
 */
const defaultCompressMinBytes = 1024;
/**
 * Asserts that the options writeMaxBytes, readMaxBytes, and compressMinBytes
 * are within sane limits, and returns default values where no value is
 * provided.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateReadWriteMaxBytes(readMaxBytes, writeMaxBytes, compressMinBytes) {
    writeMaxBytes !== null && writeMaxBytes !== void 0 ? writeMaxBytes : (writeMaxBytes = maxWriteMaxBytes);
    readMaxBytes !== null && readMaxBytes !== void 0 ? readMaxBytes : (readMaxBytes = maxReadMaxBytes);
    compressMinBytes !== null && compressMinBytes !== void 0 ? compressMinBytes : (compressMinBytes = defaultCompressMinBytes);
    if (writeMaxBytes < 1 || writeMaxBytes > maxWriteMaxBytes) {
        throw new ConnectError(`writeMaxBytes ${writeMaxBytes} must be >= 1 and <= ${maxWriteMaxBytes}`, Code.Internal);
    }
    if (readMaxBytes < 1 || readMaxBytes > maxReadMaxBytes) {
        throw new ConnectError(`readMaxBytes ${readMaxBytes} must be >= 1 and <= ${maxReadMaxBytes}`, Code.Internal);
    }
    return {
        readMaxBytes,
        writeMaxBytes,
        compressMinBytes,
    };
}
/**
 * Raise an error ResourceExhausted if more than writeMaxByte are written.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function assertWriteMaxBytes(writeMaxBytes, bytesWritten) {
    if (bytesWritten > writeMaxBytes) {
        throw new ConnectError(`message size ${bytesWritten} is larger than configured writeMaxBytes ${writeMaxBytes}`, Code.ResourceExhausted);
    }
}
/**
 * Raise an error ResourceExhausted if more than readMaxBytes are read.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function assertReadMaxBytes(readMaxBytes, bytesRead, totalSizeKnown = false) {
    if (bytesRead > readMaxBytes) {
        let message = `message size is larger than configured readMaxBytes ${readMaxBytes}`;
        if (totalSizeKnown) {
            message = `message size ${bytesRead} is larger than configured readMaxBytes ${readMaxBytes}`;
        }
        throw new ConnectError(message, Code.ResourceExhausted);
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues$2 = (undefined && undefined.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await$2 = (undefined && undefined.__await) || function (v) { return this instanceof __await$2 ? (this.v = v, this) : new __await$2(v); };
var __asyncGenerator$2 = (undefined && undefined.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await$2 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __asyncDelegator$2 = (undefined && undefined.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await$2(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
function pipeTo(source, ...rest) {
    const [transforms, sink, opt] = pickTransformsAndSink(rest);
    let iterable = source;
    let abortable;
    if ((opt === null || opt === void 0 ? void 0 : opt.propagateDownStreamError) === true) {
        iterable = abortable = makeIterableAbortable(iterable);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    iterable = pipe(iterable, ...transforms, { propagateDownStreamError: false });
    return sink(iterable).catch((reason) => {
        if (abortable) {
            return abortable.abort(reason).then(() => Promise.reject(reason));
        }
        return Promise.reject(reason);
    });
}
// pick transforms, the sink, and options from the pipeTo() rest parameter
function pickTransformsAndSink(rest) {
    let opt;
    if (typeof rest[rest.length - 1] != "function") {
        opt = rest.pop();
    }
    const sink = rest.pop();
    return [rest, sink, opt];
}
function pipe(source, ...rest) {
    return __asyncGenerator$2(this, arguments, function* pipe_1() {
        var _a;
        const [transforms, opt] = pickTransforms(rest);
        let abortable;
        const sourceIt = source[Symbol.asyncIterator]();
        const cachedSource = {
            [Symbol.asyncIterator]() {
                return sourceIt;
            },
        };
        let iterable = cachedSource;
        if ((opt === null || opt === void 0 ? void 0 : opt.propagateDownStreamError) === true) {
            iterable = abortable = makeIterableAbortable(iterable);
        }
        for (const t of transforms) {
            iterable = t(iterable);
        }
        const it = iterable[Symbol.asyncIterator]();
        try {
            for (;;) {
                const r = yield __await$2(it.next());
                if (r.done === true) {
                    break;
                }
                if (!abortable) {
                    yield yield __await$2(r.value);
                    continue;
                }
                try {
                    yield yield __await$2(r.value);
                }
                catch (e) {
                    yield __await$2(abortable.abort(e)); // propagate downstream error to the source
                    throw e;
                }
            }
        }
        finally {
            if ((opt === null || opt === void 0 ? void 0 : opt.propagateDownStreamError) === true) {
                // Call return on the source iterable to indicate
                // that we will no longer consume it and it should
                // cleanup any allocated resources.
                (_a = sourceIt.return) === null || _a === void 0 ? void 0 : _a.call(sourceIt).catch(() => {
                    // return returns a promise, which we don't care about.
                    //
                    // Uncaught promises are thrown at sometime/somewhere by the event loop,
                    // this is to ensure error is caught and ignored.
                });
            }
        }
    });
}
function pickTransforms(rest) {
    let opt;
    if (typeof rest[rest.length - 1] != "function") {
        opt = rest.pop();
    }
    return [rest, opt];
}
function transformSerializeEnvelope(serialization, endStreamFlag, endSerialization) {
    {
        return function (iterable) {
            return __asyncGenerator$2(this, arguments, function* () {
                var _a, e_4, _b, _c;
                try {
                    for (var _d = true, iterable_4 = __asyncValues$2(iterable), iterable_4_1; iterable_4_1 = yield __await$2(iterable_4.next()), _a = iterable_4_1.done, !_a; _d = true) {
                        _c = iterable_4_1.value;
                        _d = false;
                        const chunk = _c;
                        const data = serialization.serialize(chunk);
                        yield yield __await$2({ flags: 0, data });
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = iterable_4.return)) yield __await$2(_b.call(iterable_4));
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            });
        };
    }
}
function transformParseEnvelope(serialization, endStreamFlag, endSerialization) {
    // code path always yields T
    return function (iterable) {
        return __asyncGenerator$2(this, arguments, function* () {
            var _a, e_7, _b, _c;
            try {
                for (var _d = true, iterable_7 = __asyncValues$2(iterable), iterable_7_1; iterable_7_1 = yield __await$2(iterable_7.next()), _a = iterable_7_1.done, !_a; _d = true) {
                    _c = iterable_7_1.value;
                    _d = false;
                    const { flags, data } = _c;
                    if (endStreamFlag !== undefined &&
                        (flags & endStreamFlag) === endStreamFlag) ;
                    yield yield __await$2(serialization.parse(data));
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_7.return)) yield __await$2(_b.call(iterable_7));
                }
                finally { if (e_7) throw e_7.error; }
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that takes enveloped messages as a source,
 * and compresses them if they are larger than compressMinBytes.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformCompressEnvelope(compression, compressMinBytes) {
    return function (iterable) {
        return __asyncGenerator$2(this, arguments, function* () {
            var _a, e_8, _b, _c;
            try {
                for (var _d = true, iterable_8 = __asyncValues$2(iterable), iterable_8_1; iterable_8_1 = yield __await$2(iterable_8.next()), _a = iterable_8_1.done, !_a; _d = true) {
                    _c = iterable_8_1.value;
                    _d = false;
                    const env = _c;
                    yield yield __await$2(yield __await$2(envelopeCompress(env, compression, compressMinBytes)));
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_8.return)) yield __await$2(_b.call(iterable_8));
                }
                finally { if (e_8) throw e_8.error; }
            }
        });
    };
}
/**
 * Creates an AsyncIterableTransform that takes enveloped messages as a source,
 * and decompresses them using the given compression.
 *
 * The iterable raises an error if the decompressed payload of an enveloped
 * message is larger than readMaxBytes, or if no compression is provided.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformDecompressEnvelope(compression, readMaxBytes) {
    return function (iterable) {
        return __asyncGenerator$2(this, arguments, function* () {
            var _a, e_9, _b, _c;
            try {
                for (var _d = true, iterable_9 = __asyncValues$2(iterable), iterable_9_1; iterable_9_1 = yield __await$2(iterable_9.next()), _a = iterable_9_1.done, !_a; _d = true) {
                    _c = iterable_9_1.value;
                    _d = false;
                    const env = _c;
                    yield yield __await$2(yield __await$2(envelopeDecompress(env, compression, readMaxBytes)));
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_9.return)) yield __await$2(_b.call(iterable_9));
                }
                finally { if (e_9) throw e_9.error; }
            }
        });
    };
}
/**
 * Create an AsyncIterableTransform that takes enveloped messages as a source,
 * and joins them into a stream of raw bytes.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformJoinEnvelopes() {
    return function (iterable) {
        return __asyncGenerator$2(this, arguments, function* () {
            var _a, e_10, _b, _c;
            try {
                for (var _d = true, iterable_10 = __asyncValues$2(iterable), iterable_10_1; iterable_10_1 = yield __await$2(iterable_10.next()), _a = iterable_10_1.done, !_a; _d = true) {
                    _c = iterable_10_1.value;
                    _d = false;
                    const { flags, data } = _c;
                    yield yield __await$2(encodeEnvelope(flags, data));
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_10.return)) yield __await$2(_b.call(iterable_10));
                }
                finally { if (e_10) throw e_10.error; }
            }
        });
    };
}
/**
 * Create an AsyncIterableTransform that takes raw bytes as a source, and splits
 * them into enveloped messages.
 *
 * The iterable raises an error
 * - if the payload of an enveloped message is larger than readMaxBytes,
 * - if the stream ended before an enveloped message fully arrived,
 * - or if the stream ended with extraneous data.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function transformSplitEnvelope(readMaxBytes) {
    // append chunk to buffer, returning updated buffer
    function append(buffer, chunk) {
        const n = new Uint8Array(buffer.byteLength + chunk.byteLength);
        n.set(buffer);
        n.set(chunk, buffer.length);
        return n;
    }
    // tuple 0: envelope, or undefined if incomplete
    // tuple 1: remainder of the buffer
    function shiftEnvelope(buffer, header) {
        if (buffer.byteLength < 5 + header.length) {
            return [undefined, buffer];
        }
        return [
            { flags: header.flags, data: buffer.subarray(5, 5 + header.length) },
            buffer.subarray(5 + header.length),
        ];
    }
    // undefined: header is incomplete
    function peekHeader(buffer) {
        if (buffer.byteLength < 5) {
            return undefined;
        }
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const length = view.getUint32(1); // 4 bytes message length
        const flags = view.getUint8(0); // first byte is flags
        return { length, flags };
    }
    return function (iterable) {
        return __asyncGenerator$2(this, arguments, function* () {
            var _a, e_11, _b, _c;
            let buffer = new Uint8Array(0);
            try {
                for (var _d = true, iterable_11 = __asyncValues$2(iterable), iterable_11_1; iterable_11_1 = yield __await$2(iterable_11.next()), _a = iterable_11_1.done, !_a; _d = true) {
                    _c = iterable_11_1.value;
                    _d = false;
                    const chunk = _c;
                    buffer = append(buffer, chunk);
                    for (;;) {
                        const header = peekHeader(buffer);
                        if (!header) {
                            break;
                        }
                        assertReadMaxBytes(readMaxBytes, header.length, true);
                        let env;
                        [env, buffer] = shiftEnvelope(buffer, header);
                        if (!env) {
                            break;
                        }
                        yield yield __await$2(env);
                    }
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = iterable_11.return)) yield __await$2(_b.call(iterable_11));
                }
                finally { if (e_11) throw e_11.error; }
            }
            if (buffer.byteLength > 0) {
                const header = peekHeader(buffer);
                let message = "protocol error: incomplete envelope";
                if (header) {
                    message = `protocol error: promised ${header.length} bytes in enveloped message, got ${buffer.byteLength - 5} bytes`;
                }
                throw new ConnectError(message, Code.InvalidArgument);
            }
        });
    };
}
/**
 * Wrap the given iterable and return an iterable with an abort() method.
 *
 * This function exists purely for convenience. Where one would typically have
 * to access the iterator directly, advance through all elements, and call
 * AsyncIterator.throw() to notify the upstream iterable, this function allows
 * to use convenient for-await loops and still notify the upstream iterable:
 *
 * ```ts
 * const abortable = makeIterableAbortable(iterable);
 * for await (const ele of abortable) {
 *   await abortable.abort("ERR");
 * }
 * ```
 * There are a couple of limitations of this function:
 * - the given async iterable must implement throw
 * - the async iterable cannot be re-use
 * - if source catches errors and yields values for them, they are ignored, and
 *   the source may still dangle
 *
 * There are four possible ways an async function* can handle yield errors:
 * 1. don't catch errors at all - Abortable.abort() will resolve "rethrown"
 * 2. catch errors and rethrow - Abortable.abort() will resolve "rethrown"
 * 3. catch errors and return - Abortable.abort() will resolve "completed"
 * 4. catch errors and yield a value - Abortable.abort() will resolve "caught"
 *
 * Note that catching errors and yielding a value is problematic, and it should
 * be documented that this may leave the source in a dangling state.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function makeIterableAbortable(iterable) {
    const innerCandidate = iterable[Symbol.asyncIterator]();
    if (innerCandidate.throw === undefined) {
        throw new Error("AsyncIterable does not implement throw");
    }
    const inner = innerCandidate;
    let aborted;
    let resultPromise;
    let it = {
        next() {
            resultPromise = inner.next().finally(() => {
                resultPromise = undefined;
            });
            return resultPromise;
        },
        throw(e) {
            return inner.throw(e);
        },
    };
    if (innerCandidate.return !== undefined) {
        it = Object.assign(Object.assign({}, it), { return(value) {
                return inner.return(value);
            } });
    }
    let used = false;
    return {
        abort(reason) {
            if (aborted) {
                return aborted.state;
            }
            const f = () => {
                return inner.throw(reason).then((r) => (r.done === true ? "completed" : "caught"), () => "rethrown");
            };
            if (resultPromise) {
                aborted = { reason, state: resultPromise.then(f, f) };
                return aborted.state;
            }
            aborted = { reason, state: f() };
            return aborted.state;
        },
        [Symbol.asyncIterator]() {
            if (used) {
                throw new Error("AsyncIterable cannot be re-used");
            }
            used = true;
            return it;
        },
    };
}
/**
 * Create an asynchronous iterable from an array.
 *
 * @private Internal code, does not follow semantic versioning.
 */
// eslint-disable-next-line @typescript-eslint/require-await
function createAsyncIterable(items) {
    return __asyncGenerator$2(this, arguments, function* createAsyncIterable_1() {
        yield __await$2(yield* __asyncDelegator$2(__asyncValues$2(items)));
    });
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues$1 = (undefined && undefined.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await$1 = (undefined && undefined.__await) || function (v) { return this instanceof __await$1 ? (this.v = v, this) : new __await$1(v); };
var __asyncDelegator$1 = (undefined && undefined.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await$1(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator$1 = (undefined && undefined.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await$1 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
/**
 * Create a Client for the given service, invoking RPCs through the
 * given transport.
 */
function createClient(service, transport) {
    return makeAnyClient(service, (method) => {
        switch (method.methodKind) {
            case "unary":
                return createUnaryFn(transport, method);
            case "server_streaming":
                return createServerStreamingFn(transport, method);
            case "client_streaming":
                return createClientStreamingFn(transport, method);
            case "bidi_streaming":
                return createBiDiStreamingFn(transport, method);
            default:
                return null;
        }
    });
}
function createUnaryFn(transport, method) {
    return async function (input, options) {
        var _a, _b;
        const response = await transport.unary(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, input, options === null || options === void 0 ? void 0 : options.contextValues);
        (_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
        (_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
        return response.message;
    };
}
function createServerStreamingFn(transport, method) {
    return function (input, options) {
        return handleStreamResponse(transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, createAsyncIterable([input]), options === null || options === void 0 ? void 0 : options.contextValues), options);
    };
}
function createClientStreamingFn(transport, method) {
    return async function (request, options) {
        var _a, e_1, _b, _c;
        var _d, _e;
        const response = await transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues);
        (_d = options === null || options === void 0 ? void 0 : options.onHeader) === null || _d === void 0 ? void 0 : _d.call(options, response.header);
        let singleMessage;
        let count = 0;
        try {
            for (var _f = true, _g = __asyncValues$1(response.message), _h; _h = await _g.next(), _a = _h.done, !_a; _f = true) {
                _c = _h.value;
                _f = false;
                const message = _c;
                singleMessage = message;
                count++;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_a && (_b = _g.return)) await _b.call(_g);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (!singleMessage) {
            throw new ConnectError("protocol error: missing response message", Code.Unimplemented);
        }
        if (count > 1) {
            throw new ConnectError("protocol error: received extra messages for client streaming method", Code.Unimplemented);
        }
        (_e = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _e === void 0 ? void 0 : _e.call(options, response.trailer);
        return singleMessage;
    };
}
function createBiDiStreamingFn(transport, method) {
    return function (request, options) {
        return handleStreamResponse(transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues), options);
    };
}
function handleStreamResponse(stream, options) {
    const it = (function () {
        return __asyncGenerator$1(this, arguments, function* () {
            var _a, _b;
            const response = yield __await$1(stream);
            (_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
            yield __await$1(yield* __asyncDelegator$1(__asyncValues$1(response.message)));
            (_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
        });
    })()[Symbol.asyncIterator]();
    // Create a new iterable to omit throw/return.
    return {
        [Symbol.asyncIterator]: () => ({
            next: () => it.next(),
        }),
    };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Create an AbortController that is automatically aborted if one of the given
 * signals is aborted.
 *
 * For convenience, the linked AbortSignals can be undefined.
 *
 * If the controller or any of the signals is aborted, all event listeners are
 * removed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createLinkedAbortController(...signals) {
    const controller = new AbortController();
    const sa = signals.filter((s) => s !== undefined).concat(controller.signal);
    for (const signal of sa) {
        if (signal.aborted) {
            onAbort.apply(signal);
            break;
        }
        signal.addEventListener("abort", onAbort);
    }
    function onAbort() {
        if (!controller.signal.aborted) {
            controller.abort(getAbortSignalReason(this));
        }
        for (const signal of sa) {
            signal.removeEventListener("abort", onAbort);
        }
    }
    return controller;
}
/**
 * Create a deadline signal. The returned object contains an AbortSignal, but
 * also a cleanup function to stop the timer, which must be called once the
 * calling code is no longer interested in the signal.
 *
 * Ideally, we would simply use AbortSignal.timeout(), but it is not widely
 * available yet.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createDeadlineSignal(timeoutMs) {
    const controller = new AbortController();
    const listener = () => {
        controller.abort(new ConnectError("the operation timed out", Code.DeadlineExceeded));
    };
    let timeoutId;
    if (timeoutMs !== undefined) {
        if (timeoutMs <= 0)
            listener();
        else
            timeoutId = setTimeout(listener, timeoutMs);
    }
    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timeoutId),
    };
}
/**
 * Returns the reason why an AbortSignal was aborted. Returns undefined if the
 * signal has not been aborted.
 *
 * The property AbortSignal.reason is not widely available. This function
 * returns an AbortError if the signal is aborted, but reason is undefined.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function getAbortSignalReason(signal) {
    if (!signal.aborted) {
        return undefined;
    }
    if (signal.reason !== undefined) {
        return signal.reason;
    }
    // AbortSignal.reason is available in Node.js v16, v18, and later,
    // and in all browsers since early 2022.
    const e = new Error("This operation was aborted");
    e.name = "AbortError";
    return e;
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * createContextValues creates a new ContextValues.
 */
function createContextValues() {
    return {
        get(key) {
            return key.id in this ? this[key.id] : key.defaultValue;
        },
        set(key, value) {
            this[key.id] = value;
            return this;
        },
        delete(key) {
            delete this[key.id];
            return this;
        },
    };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @private Internal code, does not follow semantic versioning.
 */
const headerContentType = "Content-Type";
const headerEncoding = "Grpc-Encoding";
const headerAcceptEncoding = "Grpc-Accept-Encoding";
const headerTimeout = "Grpc-Timeout";
const headerGrpcStatus = "Grpc-Status";
const headerGrpcMessage = "Grpc-Message";
const headerStatusDetailsBin = "Grpc-Status-Details-Bin";
const headerUserAgent = "User-Agent";

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Return a fully-qualified name for a Protobuf descriptor.
 * For a file descriptor, return the original file path.
 *
 * See https://protobuf.com/docs/language-spec#fully-qualified-names
 */
/**
 * Converts snake_case to protoCamelCase according to the convention
 * used by protoc to convert a field name to a JSON name.
 */
function protoCamelCase(snakeCase) {
    let capNext = false;
    const b = [];
    for (let i = 0; i < snakeCase.length; i++) {
        let c = snakeCase.charAt(i);
        switch (c) {
            case "_":
                capNext = true;
                break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                b.push(c);
                capNext = false;
                break;
            default:
                if (capNext) {
                    capNext = false;
                    c = c.toUpperCase();
                }
                b.push(c);
                break;
        }
    }
    return b.join("");
}
/**
 * Names that cannot be used for object properties because they are reserved
 * by built-in JavaScript properties.
 */
const reservedObjectProperties = new Set([
    // names reserved by JavaScript
    "constructor",
    "toString",
    "toJSON",
    "valueOf",
]);
/**
 * Escapes names that are reserved for ECMAScript built-in object properties.
 *
 * Also see safeIdentifier() from @bufbuild/protoplugin.
 */
function safeObjectProperty(name) {
    return reservedObjectProperties.has(name) ? name + "$" : name;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @private
 */
function restoreJsonNames(message) {
    for (const f of message.field) {
        if (!unsafeIsSetExplicit(f, "jsonName")) {
            f.jsonName = protoCamelCase(f.name);
        }
    }
    message.nestedType.forEach(restoreJsonNames);
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Iterate over all types - enumerations, extensions, services, messages -
 * and enumerations, extensions and messages nested in messages.
 */
function* nestedTypes(desc) {
    switch (desc.kind) {
        case "file":
            for (const message of desc.messages) {
                yield message;
                yield* nestedTypes(message);
            }
            yield* desc.enums;
            yield* desc.services;
            yield* desc.extensions;
            break;
        case "message":
            for (const message of desc.nestedMessages) {
                yield message;
                yield* nestedTypes(message);
            }
            yield* desc.nestedEnums;
            yield* desc.nestedExtensions;
            break;
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
function createFileRegistry(...args) {
    const registry = createBaseRegistry();
    if (!args.length) {
        return registry;
    }
    if ("$typeName" in args[0] &&
        args[0].$typeName == "google.protobuf.FileDescriptorSet") {
        for (const file of args[0].file) {
            addFile(file, registry);
        }
        return registry;
    }
    if ("$typeName" in args[0]) {
        const input = args[0];
        const resolve = args[1];
        const seen = new Set();
        function recurseDeps(file) {
            const deps = [];
            for (const protoFileName of file.dependency) {
                if (registry.getFile(protoFileName) != undefined) {
                    continue;
                }
                if (seen.has(protoFileName)) {
                    continue;
                }
                const dep = resolve(protoFileName);
                if (!dep) {
                    throw new Error(`Unable to resolve ${protoFileName}, imported by ${file.name}`);
                }
                if ("kind" in dep) {
                    registry.addFile(dep, false, true);
                }
                else {
                    seen.add(dep.name);
                    deps.push(dep);
                }
            }
            return deps.concat(...deps.map(recurseDeps));
        }
        for (const file of [input, ...recurseDeps(input)].reverse()) {
            addFile(file, registry);
        }
    }
    else {
        for (const fileReg of args) {
            for (const file of fileReg.files) {
                registry.addFile(file);
            }
        }
    }
    return registry;
}
/**
 * @private
 */
function createBaseRegistry() {
    const types = new Map();
    const extendees = new Map();
    const files = new Map();
    return {
        kind: "registry",
        types,
        extendees,
        [Symbol.iterator]() {
            return types.values();
        },
        get files() {
            return files.values();
        },
        addFile(file, skipTypes, withDeps) {
            files.set(file.proto.name, file);
            if (!skipTypes) {
                for (const type of nestedTypes(file)) {
                    this.add(type);
                }
            }
            if (withDeps) {
                for (const f of file.dependencies) {
                    this.addFile(f, skipTypes, withDeps);
                }
            }
        },
        add(desc) {
            if (desc.kind == "extension") {
                let numberToExt = extendees.get(desc.extendee.typeName);
                if (!numberToExt) {
                    extendees.set(desc.extendee.typeName, 
                    // biome-ignore lint/suspicious/noAssignInExpressions: no
                    (numberToExt = new Map()));
                }
                numberToExt.set(desc.number, desc);
            }
            types.set(desc.typeName, desc);
        },
        get(typeName) {
            return types.get(typeName);
        },
        getFile(fileName) {
            return files.get(fileName);
        },
        getMessage(typeName) {
            const t = types.get(typeName);
            return (t === null || t === void 0 ? void 0 : t.kind) == "message" ? t : undefined;
        },
        getEnum(typeName) {
            const t = types.get(typeName);
            return (t === null || t === void 0 ? void 0 : t.kind) == "enum" ? t : undefined;
        },
        getExtension(typeName) {
            const t = types.get(typeName);
            return (t === null || t === void 0 ? void 0 : t.kind) == "extension" ? t : undefined;
        },
        getExtensionFor(extendee, no) {
            var _a;
            return (_a = extendees.get(extendee.typeName)) === null || _a === void 0 ? void 0 : _a.get(no);
        },
        getService(typeName) {
            const t = types.get(typeName);
            return (t === null || t === void 0 ? void 0 : t.kind) == "service" ? t : undefined;
        },
    };
}
// bootstrap-inject google.protobuf.Edition.EDITION_PROTO2: const $name: Edition.$localName = $number;
const EDITION_PROTO2 = 998;
// bootstrap-inject google.protobuf.Edition.EDITION_PROTO3: const $name: Edition.$localName = $number;
const EDITION_PROTO3 = 999;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Type.TYPE_STRING: const $name: FieldDescriptorProto_Type.$localName = $number;
const TYPE_STRING = 9;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Type.TYPE_GROUP: const $name: FieldDescriptorProto_Type.$localName = $number;
const TYPE_GROUP = 10;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Type.TYPE_MESSAGE: const $name: FieldDescriptorProto_Type.$localName = $number;
const TYPE_MESSAGE = 11;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Type.TYPE_BYTES: const $name: FieldDescriptorProto_Type.$localName = $number;
const TYPE_BYTES = 12;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Type.TYPE_ENUM: const $name: FieldDescriptorProto_Type.$localName = $number;
const TYPE_ENUM = 14;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Label.LABEL_REPEATED: const $name: FieldDescriptorProto_Label.$localName = $number;
const LABEL_REPEATED = 3;
// bootstrap-inject google.protobuf.FieldDescriptorProto.Label.LABEL_REQUIRED: const $name: FieldDescriptorProto_Label.$localName = $number;
const LABEL_REQUIRED = 2;
// bootstrap-inject google.protobuf.FieldOptions.JSType.JS_STRING: const $name: FieldOptions_JSType.$localName = $number;
const JS_STRING = 1;
// bootstrap-inject google.protobuf.MethodOptions.IdempotencyLevel.IDEMPOTENCY_UNKNOWN: const $name: MethodOptions_IdempotencyLevel.$localName = $number;
const IDEMPOTENCY_UNKNOWN = 0;
// bootstrap-inject google.protobuf.FeatureSet.FieldPresence.EXPLICIT: const $name: FeatureSet_FieldPresence.$localName = $number;
const EXPLICIT = 1;
// bootstrap-inject google.protobuf.FeatureSet.FieldPresence.IMPLICIT: const $name: FeatureSet_FieldPresence.$localName = $number;
const IMPLICIT = 2;
// bootstrap-inject google.protobuf.FeatureSet.FieldPresence.LEGACY_REQUIRED: const $name: FeatureSet_FieldPresence.$localName = $number;
const LEGACY_REQUIRED = 3;
// bootstrap-inject google.protobuf.FeatureSet.RepeatedFieldEncoding.PACKED: const $name: FeatureSet_RepeatedFieldEncoding.$localName = $number;
const PACKED = 1;
// bootstrap-inject google.protobuf.FeatureSet.MessageEncoding.DELIMITED: const $name: FeatureSet_MessageEncoding.$localName = $number;
const DELIMITED = 2;
// bootstrap-inject google.protobuf.FeatureSet.EnumType.OPEN: const $name: FeatureSet_EnumType.$localName = $number;
const OPEN = 1;
const featureDefaults = {
    // EDITION_PROTO2
    998: {
        fieldPresence: 1, // EXPLICIT,
        enumType: 2, // CLOSED,
        repeatedFieldEncoding: 2, // EXPANDED,
        utf8Validation: 3, // NONE,
        messageEncoding: 1, // LENGTH_PREFIXED,
        jsonFormat: 2, // LEGACY_BEST_EFFORT,
        enforceNamingStyle: 2, // STYLE_LEGACY,
    },
    // EDITION_PROTO3
    999: {
        fieldPresence: 2, // IMPLICIT,
        enumType: 1, // OPEN,
        repeatedFieldEncoding: 1, // PACKED,
        utf8Validation: 2, // VERIFY,
        messageEncoding: 1, // LENGTH_PREFIXED,
        jsonFormat: 1, // ALLOW,
        enforceNamingStyle: 2, // STYLE_LEGACY,
    },
    // EDITION_2023
    1000: {
        fieldPresence: 1, // EXPLICIT,
        enumType: 1, // OPEN,
        repeatedFieldEncoding: 1, // PACKED,
        utf8Validation: 2, // VERIFY,
        messageEncoding: 1, // LENGTH_PREFIXED,
        jsonFormat: 1, // ALLOW,
        enforceNamingStyle: 2, // STYLE_LEGACY,
    },
};
/**
 * Create a descriptor for a file, add it to the registry.
 */
function addFile(proto, reg) {
    var _a, _b;
    const file = {
        kind: "file",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        edition: getFileEdition(proto),
        name: proto.name.replace(/\.proto$/, ""),
        dependencies: findFileDependencies(proto, reg),
        enums: [],
        messages: [],
        extensions: [],
        services: [],
        toString() {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- we asserted above
            return `file ${proto.name}`;
        },
    };
    const mapEntriesStore = new Map();
    const mapEntries = {
        get(typeName) {
            return mapEntriesStore.get(typeName);
        },
        add(desc) {
            var _a;
            assert(((_a = desc.proto.options) === null || _a === void 0 ? void 0 : _a.mapEntry) === true);
            mapEntriesStore.set(desc.typeName, desc);
        },
    };
    for (const enumProto of proto.enumType) {
        addEnum(enumProto, file, undefined, reg);
    }
    for (const messageProto of proto.messageType) {
        addMessage(messageProto, file, undefined, reg, mapEntries);
    }
    for (const serviceProto of proto.service) {
        addService(serviceProto, file, reg);
    }
    addExtensions(file, reg);
    for (const mapEntry of mapEntriesStore.values()) {
        // to create a map field, we need access to the map entry's fields
        addFields(mapEntry, reg, mapEntries);
    }
    for (const message of file.messages) {
        addFields(message, reg, mapEntries);
        addExtensions(message, reg);
    }
    reg.addFile(file, true);
}
/**
 * Create descriptors for extensions, and add them to the message / file,
 * and to our cart.
 * Recurses into nested types.
 */
function addExtensions(desc, reg) {
    switch (desc.kind) {
        case "file":
            for (const proto of desc.proto.extension) {
                const ext = newField(proto, desc, reg);
                desc.extensions.push(ext);
                reg.add(ext);
            }
            break;
        case "message":
            for (const proto of desc.proto.extension) {
                const ext = newField(proto, desc, reg);
                desc.nestedExtensions.push(ext);
                reg.add(ext);
            }
            for (const message of desc.nestedMessages) {
                addExtensions(message, reg);
            }
            break;
    }
}
/**
 * Create descriptors for fields and oneof groups, and add them to the message.
 * Recurses into nested types.
 */
function addFields(message, reg, mapEntries) {
    const allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message));
    const oneofsSeen = new Set();
    for (const proto of message.proto.field) {
        const oneof = findOneof(proto, allOneofs);
        const field = newField(proto, message, reg, oneof, mapEntries);
        message.fields.push(field);
        message.field[field.localName] = field;
        if (oneof === undefined) {
            message.members.push(field);
        }
        else {
            oneof.fields.push(field);
            if (!oneofsSeen.has(oneof)) {
                oneofsSeen.add(oneof);
                message.members.push(oneof);
            }
        }
    }
    for (const oneof of allOneofs.filter((o) => oneofsSeen.has(o))) {
        message.oneofs.push(oneof);
    }
    for (const child of message.nestedMessages) {
        addFields(child, reg, mapEntries);
    }
}
/**
 * Create a descriptor for an enumeration, and add it our cart and to the
 * parent type, if any.
 */
function addEnum(proto, file, parent, reg) {
    var _a, _b, _c, _d, _e;
    const sharedPrefix = findEnumSharedPrefix(proto.name, proto.value);
    const desc = {
        kind: "enum",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        file,
        parent,
        open: true,
        name: proto.name,
        typeName: makeTypeName(proto, parent, file),
        value: {},
        values: [],
        sharedPrefix,
        toString() {
            return `enum ${this.typeName}`;
        },
    };
    desc.open = isEnumOpen(desc);
    reg.add(desc);
    for (const p of proto.value) {
        const name = p.name;
        desc.values.push(
        // biome-ignore lint/suspicious/noAssignInExpressions: no
        (desc.value[p.number] = {
            kind: "enum_value",
            proto: p,
            deprecated: (_d = (_c = p.options) === null || _c === void 0 ? void 0 : _c.deprecated) !== null && _d !== void 0 ? _d : false,
            parent: desc,
            name,
            localName: safeObjectProperty(sharedPrefix == undefined
                ? name
                : name.substring(sharedPrefix.length)),
            number: p.number,
            toString() {
                return `enum value ${desc.typeName}.${name}`;
            },
        }));
    }
    ((_e = parent === null || parent === void 0 ? void 0 : parent.nestedEnums) !== null && _e !== void 0 ? _e : file.enums).push(desc);
}
/**
 * Create a descriptor for a message, including nested types, and add it to our
 * cart. Note that this does not create descriptors fields.
 */
function addMessage(proto, file, parent, reg, mapEntries) {
    var _a, _b, _c, _d;
    const desc = {
        kind: "message",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        file,
        parent,
        name: proto.name,
        typeName: makeTypeName(proto, parent, file),
        fields: [],
        field: {},
        oneofs: [],
        members: [],
        nestedEnums: [],
        nestedMessages: [],
        nestedExtensions: [],
        toString() {
            return `message ${this.typeName}`;
        },
    };
    if (((_c = proto.options) === null || _c === void 0 ? void 0 : _c.mapEntry) === true) {
        mapEntries.add(desc);
    }
    else {
        ((_d = parent === null || parent === void 0 ? void 0 : parent.nestedMessages) !== null && _d !== void 0 ? _d : file.messages).push(desc);
        reg.add(desc);
    }
    for (const enumProto of proto.enumType) {
        addEnum(enumProto, file, desc, reg);
    }
    for (const messageProto of proto.nestedType) {
        addMessage(messageProto, file, desc, reg, mapEntries);
    }
}
/**
 * Create a descriptor for a service, including methods, and add it to our
 * cart.
 */
function addService(proto, file, reg) {
    var _a, _b;
    const desc = {
        kind: "service",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        file,
        name: proto.name,
        typeName: makeTypeName(proto, undefined, file),
        methods: [],
        method: {},
        toString() {
            return `service ${this.typeName}`;
        },
    };
    file.services.push(desc);
    reg.add(desc);
    for (const methodProto of proto.method) {
        const method = newMethod(methodProto, desc, reg);
        desc.methods.push(method);
        desc.method[method.localName] = method;
    }
}
/**
 * Create a descriptor for a method.
 */
function newMethod(proto, parent, reg) {
    var _a, _b, _c, _d;
    let methodKind;
    if (proto.clientStreaming && proto.serverStreaming) {
        methodKind = "bidi_streaming";
    }
    else if (proto.clientStreaming) {
        methodKind = "client_streaming";
    }
    else if (proto.serverStreaming) {
        methodKind = "server_streaming";
    }
    else {
        methodKind = "unary";
    }
    const input = reg.getMessage(trimLeadingDot(proto.inputType));
    const output = reg.getMessage(trimLeadingDot(proto.outputType));
    assert(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
    assert(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
    const name = proto.name;
    return {
        kind: "rpc",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        parent,
        name,
        localName: safeObjectProperty(name.length
            ? safeObjectProperty(name[0].toLowerCase() + name.substring(1))
            : name),
        methodKind,
        input,
        output,
        idempotency: (_d = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.idempotencyLevel) !== null && _d !== void 0 ? _d : IDEMPOTENCY_UNKNOWN,
        toString() {
            return `rpc ${parent.typeName}.${name}`;
        },
    };
}
/**
 * Create a descriptor for a oneof group.
 */
function newOneof(proto, parent) {
    return {
        kind: "oneof",
        proto,
        deprecated: false,
        parent,
        fields: [],
        name: proto.name,
        localName: safeObjectProperty(protoCamelCase(proto.name)),
        toString() {
            return `oneof ${parent.typeName}.${this.name}`;
        },
    };
}
function newField(proto, parentOrFile, reg, oneof, mapEntries) {
    var _a, _b, _c;
    const isExtension = mapEntries === undefined;
    const field = {
        kind: "field",
        proto,
        deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
        name: proto.name,
        number: proto.number,
        scalar: undefined,
        message: undefined,
        enum: undefined,
        presence: getFieldPresence(proto, oneof, isExtension, parentOrFile),
        listKind: undefined,
        mapKind: undefined,
        mapKey: undefined,
        delimitedEncoding: undefined,
        packed: undefined,
        longAsString: false,
        getDefaultValue: undefined,
    };
    if (isExtension) {
        // extension field
        const file = parentOrFile.kind == "file" ? parentOrFile : parentOrFile.file;
        const parent = parentOrFile.kind == "file" ? undefined : parentOrFile;
        const typeName = makeTypeName(proto, parent, file);
        field.kind = "extension";
        field.file = file;
        field.parent = parent;
        field.oneof = undefined;
        field.typeName = typeName;
        field.jsonName = `[${typeName}]`; // option json_name is not allowed on extension fields
        field.toString = () => `extension ${typeName}`;
        const extendee = reg.getMessage(trimLeadingDot(proto.extendee));
        assert(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
        field.extendee = extendee;
    }
    else {
        // regular field
        const parent = parentOrFile;
        assert(parent.kind == "message");
        field.parent = parent;
        field.oneof = oneof;
        field.localName = oneof
            ? protoCamelCase(proto.name)
            : safeObjectProperty(protoCamelCase(proto.name));
        field.jsonName = proto.jsonName;
        field.toString = () => `field ${parent.typeName}.${proto.name}`;
    }
    const label = proto.label;
    const type = proto.type;
    const jstype = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.jstype;
    if (label === LABEL_REPEATED) {
        // list or map field
        const mapEntry = type == TYPE_MESSAGE
            ? mapEntries === null || mapEntries === void 0 ? void 0 : mapEntries.get(trimLeadingDot(proto.typeName))
            : undefined;
        if (mapEntry) {
            // map field
            field.fieldKind = "map";
            const { key, value } = findMapEntryFields(mapEntry);
            field.mapKey = key.scalar;
            field.mapKind = value.fieldKind;
            field.message = value.message;
            field.delimitedEncoding = false; // map fields are always LENGTH_PREFIXED
            field.enum = value.enum;
            field.scalar = value.scalar;
            return field;
        }
        // list field
        field.fieldKind = "list";
        switch (type) {
            case TYPE_MESSAGE:
            case TYPE_GROUP:
                field.listKind = "message";
                field.message = reg.getMessage(trimLeadingDot(proto.typeName));
                assert(field.message);
                field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
                break;
            case TYPE_ENUM:
                field.listKind = "enum";
                field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
                assert(field.enum);
                break;
            default:
                field.listKind = "scalar";
                field.scalar = type;
                field.longAsString = jstype == JS_STRING;
                break;
        }
        field.packed = isPackedField(proto, parentOrFile);
        return field;
    }
    // singular
    switch (type) {
        case TYPE_MESSAGE:
        case TYPE_GROUP:
            field.fieldKind = "message";
            field.message = reg.getMessage(trimLeadingDot(proto.typeName));
            assert(field.message, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
            field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
            field.getDefaultValue = () => undefined;
            break;
        case TYPE_ENUM: {
            const enumeration = reg.getEnum(trimLeadingDot(proto.typeName));
            assert(enumeration !== undefined, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
            field.fieldKind = "enum";
            field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
            field.getDefaultValue = () => {
                return unsafeIsSetExplicit(proto, "defaultValue")
                    ? parseTextFormatEnumValue(enumeration, proto.defaultValue)
                    : undefined;
            };
            break;
        }
        default: {
            field.fieldKind = "scalar";
            field.scalar = type;
            field.longAsString = jstype == JS_STRING;
            field.getDefaultValue = () => {
                return unsafeIsSetExplicit(proto, "defaultValue")
                    ? parseTextFormatScalarValue(type, proto.defaultValue)
                    : undefined;
            };
            break;
        }
    }
    return field;
}
/**
 * Parse the "syntax" and "edition" fields, returning one of the supported
 * editions.
 */
function getFileEdition(proto) {
    switch (proto.syntax) {
        case "":
        case "proto2":
            return EDITION_PROTO2;
        case "proto3":
            return EDITION_PROTO3;
        case "editions":
            if (proto.edition in featureDefaults) {
                return proto.edition;
            }
            throw new Error(`${proto.name}: unsupported edition`);
        default:
            throw new Error(`${proto.name}: unsupported syntax "${proto.syntax}"`);
    }
}
/**
 * Resolve dependencies of FileDescriptorProto to DescFile.
 */
function findFileDependencies(proto, reg) {
    return proto.dependency.map((wantName) => {
        const dep = reg.getFile(wantName);
        if (!dep) {
            throw new Error(`Cannot find ${wantName}, imported by ${proto.name}`);
        }
        return dep;
    });
}
/**
 * Finds a prefix shared by enum values, for example `my_enum_` for
 * `enum MyEnum {MY_ENUM_A=0; MY_ENUM_B=1;}`.
 */
function findEnumSharedPrefix(enumName, values) {
    const prefix = camelToSnakeCase(enumName) + "_";
    for (const value of values) {
        if (!value.name.toLowerCase().startsWith(prefix)) {
            return undefined;
        }
        const shortName = value.name.substring(prefix.length);
        if (shortName.length == 0) {
            return undefined;
        }
        if (/^\d/.test(shortName)) {
            // identifiers must not start with numbers
            return undefined;
        }
    }
    return prefix;
}
/**
 * Converts lowerCamelCase or UpperCamelCase into lower_snake_case.
 * This is used to find shared prefixes in an enum.
 */
function camelToSnakeCase(camel) {
    return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
}
/**
 * Create a fully qualified name for a protobuf type or extension field.
 *
 * The fully qualified name for messages, enumerations, and services is
 * constructed by concatenating the package name (if present), parent
 * message names (for nested types), and the type name. We omit the leading
 * dot added by protobuf compilers. Examples:
 * - mypackage.MyMessage
 * - mypackage.MyMessage.NestedMessage
 *
 * The fully qualified name for extension fields is constructed by
 * concatenating the package name (if present), parent message names (for
 * extensions declared within a message), and the field name. Examples:
 * - mypackage.extfield
 * - mypackage.MyMessage.extfield
 */
function makeTypeName(proto, parent, file) {
    let typeName;
    if (parent) {
        typeName = `${parent.typeName}.${proto.name}`;
    }
    else if (file.proto.package.length > 0) {
        typeName = `${file.proto.package}.${proto.name}`;
    }
    else {
        typeName = `${proto.name}`;
    }
    return typeName;
}
/**
 * Remove the leading dot from a fully qualified type name.
 */
function trimLeadingDot(typeName) {
    return typeName.startsWith(".") ? typeName.substring(1) : typeName;
}
/**
 * Did the user put the field in a oneof group?
 * Synthetic oneofs for proto3 optionals are ignored.
 */
function findOneof(proto, allOneofs) {
    if (!unsafeIsSetExplicit(proto, "oneofIndex")) {
        return undefined;
    }
    if (proto.proto3Optional) {
        return undefined;
    }
    const oneof = allOneofs[proto.oneofIndex];
    assert(oneof, `invalid FieldDescriptorProto: oneof #${proto.oneofIndex} for field #${proto.number} not found`);
    return oneof;
}
/**
 * Presence of the field.
 * See https://protobuf.dev/programming-guides/field_presence/
 */
function getFieldPresence(proto, oneof, isExtension, parent) {
    if (proto.label == LABEL_REQUIRED) {
        // proto2 required is LEGACY_REQUIRED
        return LEGACY_REQUIRED;
    }
    if (proto.label == LABEL_REPEATED) {
        // repeated fields (including maps) do not track presence
        return IMPLICIT;
    }
    if (!!oneof || proto.proto3Optional) {
        // oneof is always explicit
        return EXPLICIT;
    }
    if (isExtension) {
        // extensions always track presence
        return EXPLICIT;
    }
    const resolved = resolveFeature("fieldPresence", { proto, parent });
    if (resolved == IMPLICIT &&
        (proto.type == TYPE_MESSAGE || proto.type == TYPE_GROUP)) {
        // singular message field cannot be implicit
        return EXPLICIT;
    }
    return resolved;
}
/**
 * Pack this repeated field?
 */
function isPackedField(proto, parent) {
    if (proto.label != LABEL_REPEATED) {
        return false;
    }
    switch (proto.type) {
        case TYPE_STRING:
        case TYPE_BYTES:
        case TYPE_GROUP:
        case TYPE_MESSAGE:
            // length-delimited types cannot be packed
            return false;
    }
    const o = proto.options;
    if (o && unsafeIsSetExplicit(o, "packed")) {
        // prefer the field option over edition features
        return o.packed;
    }
    return (PACKED ==
        resolveFeature("repeatedFieldEncoding", {
            proto,
            parent,
        }));
}
/**
 * Find the key and value fields of a synthetic map entry message.
 */
function findMapEntryFields(mapEntry) {
    const key = mapEntry.fields.find((f) => f.number === 1);
    const value = mapEntry.fields.find((f) => f.number === 2);
    assert(key &&
        key.fieldKind == "scalar" &&
        key.scalar != ScalarType.BYTES &&
        key.scalar != ScalarType.FLOAT &&
        key.scalar != ScalarType.DOUBLE &&
        value &&
        value.fieldKind != "list" &&
        value.fieldKind != "map");
    return { key, value };
}
/**
 * Enumerations can be open or closed.
 * See https://protobuf.dev/programming-guides/enum/
 */
function isEnumOpen(desc) {
    var _a;
    return (OPEN ==
        resolveFeature("enumType", {
            proto: desc.proto,
            parent: (_a = desc.parent) !== null && _a !== void 0 ? _a : desc.file,
        }));
}
/**
 * Encode the message delimited (a.k.a. proto2 group encoding), or
 * length-prefixed?
 */
function isDelimitedEncoding(proto, parent) {
    if (proto.type == TYPE_GROUP) {
        return true;
    }
    return (DELIMITED ==
        resolveFeature("messageEncoding", {
            proto,
            parent,
        }));
}
function resolveFeature(name, ref) {
    var _a, _b;
    const featureSet = (_a = ref.proto.options) === null || _a === void 0 ? void 0 : _a.features;
    if (featureSet) {
        const val = featureSet[name];
        if (val != 0) {
            return val;
        }
    }
    if ("kind" in ref) {
        if (ref.kind == "message") {
            return resolveFeature(name, (_b = ref.parent) !== null && _b !== void 0 ? _b : ref.file);
        }
        const editionDefaults = featureDefaults[ref.edition];
        if (!editionDefaults) {
            throw new Error(`feature default for edition ${ref.edition} not found`);
        }
        return editionDefaults[name];
    }
    return resolveFeature(name, ref.parent);
}
/**
 * Assert that condition is truthy or throw error (with message)
 */
function assert(condition, msg) {
    if (!condition) {
        throw new Error(msg);
    }
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Hydrate a file descriptor for google/protobuf/descriptor.proto from a plain
 * object.
 *
 * See createFileDescriptorProtoBoot() for details.
 *
 * @private
 */
function boot(boot) {
    const root = bootFileDescriptorProto(boot);
    root.messageType.forEach(restoreJsonNames);
    const reg = createFileRegistry(root, () => undefined);
    // biome-ignore lint/style/noNonNullAssertion: non-null assertion because we just created the registry from the file we look up
    return reg.getFile(root.name);
}
/**
 * Creates the message google.protobuf.FileDescriptorProto from an object literal.
 *
 * See createFileDescriptorProtoBoot() for details.
 *
 * @private
 */
function bootFileDescriptorProto(init) {
    const proto = Object.create({
        syntax: "",
        edition: 0,
    });
    return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FileDescriptorProto", dependency: [], publicDependency: [], weakDependency: [], service: [], extension: [] }, init), { messageType: init.messageType.map(bootDescriptorProto), enumType: init.enumType.map(bootEnumDescriptorProto) }));
}
function bootDescriptorProto(init) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return {
        $typeName: "google.protobuf.DescriptorProto",
        name: init.name,
        field: (_b = (_a = init.field) === null || _a === void 0 ? void 0 : _a.map(bootFieldDescriptorProto)) !== null && _b !== void 0 ? _b : [],
        extension: [],
        nestedType: (_d = (_c = init.nestedType) === null || _c === void 0 ? void 0 : _c.map(bootDescriptorProto)) !== null && _d !== void 0 ? _d : [],
        enumType: (_f = (_e = init.enumType) === null || _e === void 0 ? void 0 : _e.map(bootEnumDescriptorProto)) !== null && _f !== void 0 ? _f : [],
        extensionRange: (_h = (_g = init.extensionRange) === null || _g === void 0 ? void 0 : _g.map((e) => (Object.assign({ $typeName: "google.protobuf.DescriptorProto.ExtensionRange" }, e)))) !== null && _h !== void 0 ? _h : [],
        oneofDecl: [],
        reservedRange: [],
        reservedName: [],
    };
}
function bootFieldDescriptorProto(init) {
    const proto = Object.create({
        label: 1,
        typeName: "",
        extendee: "",
        defaultValue: "",
        oneofIndex: 0,
        jsonName: "",
        proto3Optional: false,
    });
    return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldDescriptorProto" }, init), { options: init.options ? bootFieldOptions(init.options) : undefined }));
}
function bootFieldOptions(init) {
    var _a, _b, _c;
    const proto = Object.create({
        ctype: 0,
        packed: false,
        jstype: 0,
        lazy: false,
        unverifiedLazy: false,
        deprecated: false,
        weak: false,
        debugRedact: false,
        retention: 0,
    });
    return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldOptions" }, init), { targets: (_a = init.targets) !== null && _a !== void 0 ? _a : [], editionDefaults: (_c = (_b = init.editionDefaults) === null || _b === void 0 ? void 0 : _b.map((e) => (Object.assign({ $typeName: "google.protobuf.FieldOptions.EditionDefault" }, e)))) !== null && _c !== void 0 ? _c : [], uninterpretedOption: [] }));
}
function bootEnumDescriptorProto(init) {
    return {
        $typeName: "google.protobuf.EnumDescriptorProto",
        name: init.name,
        reservedName: [],
        reservedRange: [],
        value: init.value.map((e) => (Object.assign({ $typeName: "google.protobuf.EnumValueDescriptorProto" }, e))),
    };
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Hydrate a message descriptor.
 *
 * @private
 */
function messageDesc(file, path, ...paths) {
    return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]);
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Hydrate an enum descriptor.
 *
 * @private
 */
function enumDesc(file, path, ...paths) {
    if (paths.length == 0) {
        return file.enums[path];
    }
    const e = paths.pop(); // we checked length above
    return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]).nestedEnums[e];
}
/**
 * Construct a TypeScript enum object at runtime from a descriptor.
 */
function tsEnum(desc) {
    const enumObject = {};
    for (const value of desc.values) {
        enumObject[value.localName] = value.number;
        enumObject[value.number] = value.localName;
    }
    return enumObject;
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Describes the file google/protobuf/descriptor.proto.
 */
const file_google_protobuf_descriptor$1 = /*@__PURE__*/ boot({ "name": "google/protobuf/descriptor.proto", "package": "google.protobuf", "messageType": [{ "name": "FileDescriptorSet", "field": [{ "name": "file", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.FileDescriptorProto" }], "extensionRange": [{ "start": 536000000, "end": 536000001 }] }, { "name": "FileDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "package", "number": 2, "type": 9, "label": 1 }, { "name": "dependency", "number": 3, "type": 9, "label": 3 }, { "name": "public_dependency", "number": 10, "type": 5, "label": 3 }, { "name": "weak_dependency", "number": 11, "type": 5, "label": 3 }, { "name": "message_type", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto" }, { "name": "enum_type", "number": 5, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto" }, { "name": "service", "number": 6, "type": 11, "label": 3, "typeName": ".google.protobuf.ServiceDescriptorProto" }, { "name": "extension", "number": 7, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "options", "number": 8, "type": 11, "label": 1, "typeName": ".google.protobuf.FileOptions" }, { "name": "source_code_info", "number": 9, "type": 11, "label": 1, "typeName": ".google.protobuf.SourceCodeInfo" }, { "name": "syntax", "number": 12, "type": 9, "label": 1 }, { "name": "edition", "number": 14, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }] }, { "name": "DescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "field", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "extension", "number": 6, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "nested_type", "number": 3, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto" }, { "name": "enum_type", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto" }, { "name": "extension_range", "number": 5, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto.ExtensionRange" }, { "name": "oneof_decl", "number": 8, "type": 11, "label": 3, "typeName": ".google.protobuf.OneofDescriptorProto" }, { "name": "options", "number": 7, "type": 11, "label": 1, "typeName": ".google.protobuf.MessageOptions" }, { "name": "reserved_range", "number": 9, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto.ReservedRange" }, { "name": "reserved_name", "number": 10, "type": 9, "label": 3 }], "nestedType": [{ "name": "ExtensionRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.ExtensionRangeOptions" }] }, { "name": "ReservedRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }] }] }, { "name": "ExtensionRangeOptions", "field": [{ "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }, { "name": "declaration", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.ExtensionRangeOptions.Declaration", "options": { "retention": 2 } }, { "name": "features", "number": 50, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "verification", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.ExtensionRangeOptions.VerificationState", "defaultValue": "UNVERIFIED", "options": { "retention": 2 } }], "nestedType": [{ "name": "Declaration", "field": [{ "name": "number", "number": 1, "type": 5, "label": 1 }, { "name": "full_name", "number": 2, "type": 9, "label": 1 }, { "name": "type", "number": 3, "type": 9, "label": 1 }, { "name": "reserved", "number": 5, "type": 8, "label": 1 }, { "name": "repeated", "number": 6, "type": 8, "label": 1 }] }], "enumType": [{ "name": "VerificationState", "value": [{ "name": "DECLARATION", "number": 0 }, { "name": "UNVERIFIED", "number": 1 }] }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "FieldDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "number", "number": 3, "type": 5, "label": 1 }, { "name": "label", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldDescriptorProto.Label" }, { "name": "type", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldDescriptorProto.Type" }, { "name": "type_name", "number": 6, "type": 9, "label": 1 }, { "name": "extendee", "number": 2, "type": 9, "label": 1 }, { "name": "default_value", "number": 7, "type": 9, "label": 1 }, { "name": "oneof_index", "number": 9, "type": 5, "label": 1 }, { "name": "json_name", "number": 10, "type": 9, "label": 1 }, { "name": "options", "number": 8, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions" }, { "name": "proto3_optional", "number": 17, "type": 8, "label": 1 }], "enumType": [{ "name": "Type", "value": [{ "name": "TYPE_DOUBLE", "number": 1 }, { "name": "TYPE_FLOAT", "number": 2 }, { "name": "TYPE_INT64", "number": 3 }, { "name": "TYPE_UINT64", "number": 4 }, { "name": "TYPE_INT32", "number": 5 }, { "name": "TYPE_FIXED64", "number": 6 }, { "name": "TYPE_FIXED32", "number": 7 }, { "name": "TYPE_BOOL", "number": 8 }, { "name": "TYPE_STRING", "number": 9 }, { "name": "TYPE_GROUP", "number": 10 }, { "name": "TYPE_MESSAGE", "number": 11 }, { "name": "TYPE_BYTES", "number": 12 }, { "name": "TYPE_UINT32", "number": 13 }, { "name": "TYPE_ENUM", "number": 14 }, { "name": "TYPE_SFIXED32", "number": 15 }, { "name": "TYPE_SFIXED64", "number": 16 }, { "name": "TYPE_SINT32", "number": 17 }, { "name": "TYPE_SINT64", "number": 18 }] }, { "name": "Label", "value": [{ "name": "LABEL_OPTIONAL", "number": 1 }, { "name": "LABEL_REPEATED", "number": 3 }, { "name": "LABEL_REQUIRED", "number": 2 }] }] }, { "name": "OneofDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "options", "number": 2, "type": 11, "label": 1, "typeName": ".google.protobuf.OneofOptions" }] }, { "name": "EnumDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "value", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumValueDescriptorProto" }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.EnumOptions" }, { "name": "reserved_range", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto.EnumReservedRange" }, { "name": "reserved_name", "number": 5, "type": 9, "label": 3 }], "nestedType": [{ "name": "EnumReservedRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }] }] }, { "name": "EnumValueDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "number", "number": 2, "type": 5, "label": 1 }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.EnumValueOptions" }] }, { "name": "ServiceDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "method", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.MethodDescriptorProto" }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.ServiceOptions" }] }, { "name": "MethodDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "input_type", "number": 2, "type": 9, "label": 1 }, { "name": "output_type", "number": 3, "type": 9, "label": 1 }, { "name": "options", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.MethodOptions" }, { "name": "client_streaming", "number": 5, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "server_streaming", "number": 6, "type": 8, "label": 1, "defaultValue": "false" }] }, { "name": "FileOptions", "field": [{ "name": "java_package", "number": 1, "type": 9, "label": 1 }, { "name": "java_outer_classname", "number": 8, "type": 9, "label": 1 }, { "name": "java_multiple_files", "number": 10, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "java_generate_equals_and_hash", "number": 20, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "java_string_check_utf8", "number": 27, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "optimize_for", "number": 9, "type": 14, "label": 1, "typeName": ".google.protobuf.FileOptions.OptimizeMode", "defaultValue": "SPEED" }, { "name": "go_package", "number": 11, "type": 9, "label": 1 }, { "name": "cc_generic_services", "number": 16, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "java_generic_services", "number": 17, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "py_generic_services", "number": 18, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 23, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "cc_enable_arenas", "number": 31, "type": 8, "label": 1, "defaultValue": "true" }, { "name": "objc_class_prefix", "number": 36, "type": 9, "label": 1 }, { "name": "csharp_namespace", "number": 37, "type": 9, "label": 1 }, { "name": "swift_prefix", "number": 39, "type": 9, "label": 1 }, { "name": "php_class_prefix", "number": 40, "type": 9, "label": 1 }, { "name": "php_namespace", "number": 41, "type": 9, "label": 1 }, { "name": "php_metadata_namespace", "number": 44, "type": 9, "label": 1 }, { "name": "ruby_package", "number": 45, "type": 9, "label": 1 }, { "name": "features", "number": 50, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "enumType": [{ "name": "OptimizeMode", "value": [{ "name": "SPEED", "number": 1 }, { "name": "CODE_SIZE", "number": 2 }, { "name": "LITE_RUNTIME", "number": 3 }] }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "MessageOptions", "field": [{ "name": "message_set_wire_format", "number": 1, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "no_standard_descriptor_accessor", "number": 2, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "map_entry", "number": 7, "type": 8, "label": 1 }, { "name": "deprecated_legacy_json_field_conflicts", "number": 11, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "features", "number": 12, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "FieldOptions", "field": [{ "name": "ctype", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.CType", "defaultValue": "STRING" }, { "name": "packed", "number": 2, "type": 8, "label": 1 }, { "name": "jstype", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.JSType", "defaultValue": "JS_NORMAL" }, { "name": "lazy", "number": 5, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "unverified_lazy", "number": 15, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "weak", "number": 10, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "debug_redact", "number": 16, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "retention", "number": 17, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.OptionRetention" }, { "name": "targets", "number": 19, "type": 14, "label": 3, "typeName": ".google.protobuf.FieldOptions.OptionTargetType" }, { "name": "edition_defaults", "number": 20, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldOptions.EditionDefault" }, { "name": "features", "number": 21, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "feature_support", "number": 22, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions.FeatureSupport" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "nestedType": [{ "name": "EditionDefault", "field": [{ "name": "edition", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "value", "number": 2, "type": 9, "label": 1 }] }, { "name": "FeatureSupport", "field": [{ "name": "edition_introduced", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "edition_deprecated", "number": 2, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "deprecation_warning", "number": 3, "type": 9, "label": 1 }, { "name": "edition_removed", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }] }], "enumType": [{ "name": "CType", "value": [{ "name": "STRING", "number": 0 }, { "name": "CORD", "number": 1 }, { "name": "STRING_PIECE", "number": 2 }] }, { "name": "JSType", "value": [{ "name": "JS_NORMAL", "number": 0 }, { "name": "JS_STRING", "number": 1 }, { "name": "JS_NUMBER", "number": 2 }] }, { "name": "OptionRetention", "value": [{ "name": "RETENTION_UNKNOWN", "number": 0 }, { "name": "RETENTION_RUNTIME", "number": 1 }, { "name": "RETENTION_SOURCE", "number": 2 }] }, { "name": "OptionTargetType", "value": [{ "name": "TARGET_TYPE_UNKNOWN", "number": 0 }, { "name": "TARGET_TYPE_FILE", "number": 1 }, { "name": "TARGET_TYPE_EXTENSION_RANGE", "number": 2 }, { "name": "TARGET_TYPE_MESSAGE", "number": 3 }, { "name": "TARGET_TYPE_FIELD", "number": 4 }, { "name": "TARGET_TYPE_ONEOF", "number": 5 }, { "name": "TARGET_TYPE_ENUM", "number": 6 }, { "name": "TARGET_TYPE_ENUM_ENTRY", "number": 7 }, { "name": "TARGET_TYPE_SERVICE", "number": 8 }, { "name": "TARGET_TYPE_METHOD", "number": 9 }] }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "OneofOptions", "field": [{ "name": "features", "number": 1, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "EnumOptions", "field": [{ "name": "allow_alias", "number": 2, "type": 8, "label": 1 }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated_legacy_json_field_conflicts", "number": 6, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "features", "number": 7, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "EnumValueOptions", "field": [{ "name": "deprecated", "number": 1, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "features", "number": 2, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "debug_redact", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "feature_support", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions.FeatureSupport" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "ServiceOptions", "field": [{ "name": "features", "number": 34, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "deprecated", "number": 33, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "MethodOptions", "field": [{ "name": "deprecated", "number": 33, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "idempotency_level", "number": 34, "type": 14, "label": 1, "typeName": ".google.protobuf.MethodOptions.IdempotencyLevel", "defaultValue": "IDEMPOTENCY_UNKNOWN" }, { "name": "features", "number": 35, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "enumType": [{ "name": "IdempotencyLevel", "value": [{ "name": "IDEMPOTENCY_UNKNOWN", "number": 0 }, { "name": "NO_SIDE_EFFECTS", "number": 1 }, { "name": "IDEMPOTENT", "number": 2 }] }], "extensionRange": [{ "start": 1000, "end": 536870912 }] }, { "name": "UninterpretedOption", "field": [{ "name": "name", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption.NamePart" }, { "name": "identifier_value", "number": 3, "type": 9, "label": 1 }, { "name": "positive_int_value", "number": 4, "type": 4, "label": 1 }, { "name": "negative_int_value", "number": 5, "type": 3, "label": 1 }, { "name": "double_value", "number": 6, "type": 1, "label": 1 }, { "name": "string_value", "number": 7, "type": 12, "label": 1 }, { "name": "aggregate_value", "number": 8, "type": 9, "label": 1 }], "nestedType": [{ "name": "NamePart", "field": [{ "name": "name_part", "number": 1, "type": 9, "label": 2 }, { "name": "is_extension", "number": 2, "type": 8, "label": 2 }] }] }, { "name": "FeatureSet", "field": [{ "name": "field_presence", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.FieldPresence", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "EXPLICIT", "edition": 900 }, { "value": "IMPLICIT", "edition": 999 }, { "value": "EXPLICIT", "edition": 1000 }] } }, { "name": "enum_type", "number": 2, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.EnumType", "options": { "retention": 1, "targets": [6, 1], "editionDefaults": [{ "value": "CLOSED", "edition": 900 }, { "value": "OPEN", "edition": 999 }] } }, { "name": "repeated_field_encoding", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.RepeatedFieldEncoding", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "EXPANDED", "edition": 900 }, { "value": "PACKED", "edition": 999 }] } }, { "name": "utf8_validation", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.Utf8Validation", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "NONE", "edition": 900 }, { "value": "VERIFY", "edition": 999 }] } }, { "name": "message_encoding", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.MessageEncoding", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "LENGTH_PREFIXED", "edition": 900 }] } }, { "name": "json_format", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.JsonFormat", "options": { "retention": 1, "targets": [3, 6, 1], "editionDefaults": [{ "value": "LEGACY_BEST_EFFORT", "edition": 900 }, { "value": "ALLOW", "edition": 999 }] } }, { "name": "enforce_naming_style", "number": 7, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.EnforceNamingStyle", "options": { "retention": 2, "targets": [1, 2, 3, 4, 5, 6, 7, 8, 9], "editionDefaults": [{ "value": "STYLE_LEGACY", "edition": 900 }, { "value": "STYLE2024", "edition": 1001 }] } }], "enumType": [{ "name": "FieldPresence", "value": [{ "name": "FIELD_PRESENCE_UNKNOWN", "number": 0 }, { "name": "EXPLICIT", "number": 1 }, { "name": "IMPLICIT", "number": 2 }, { "name": "LEGACY_REQUIRED", "number": 3 }] }, { "name": "EnumType", "value": [{ "name": "ENUM_TYPE_UNKNOWN", "number": 0 }, { "name": "OPEN", "number": 1 }, { "name": "CLOSED", "number": 2 }] }, { "name": "RepeatedFieldEncoding", "value": [{ "name": "REPEATED_FIELD_ENCODING_UNKNOWN", "number": 0 }, { "name": "PACKED", "number": 1 }, { "name": "EXPANDED", "number": 2 }] }, { "name": "Utf8Validation", "value": [{ "name": "UTF8_VALIDATION_UNKNOWN", "number": 0 }, { "name": "VERIFY", "number": 2 }, { "name": "NONE", "number": 3 }] }, { "name": "MessageEncoding", "value": [{ "name": "MESSAGE_ENCODING_UNKNOWN", "number": 0 }, { "name": "LENGTH_PREFIXED", "number": 1 }, { "name": "DELIMITED", "number": 2 }] }, { "name": "JsonFormat", "value": [{ "name": "JSON_FORMAT_UNKNOWN", "number": 0 }, { "name": "ALLOW", "number": 1 }, { "name": "LEGACY_BEST_EFFORT", "number": 2 }] }, { "name": "EnforceNamingStyle", "value": [{ "name": "ENFORCE_NAMING_STYLE_UNKNOWN", "number": 0 }, { "name": "STYLE2024", "number": 1 }, { "name": "STYLE_LEGACY", "number": 2 }] }], "extensionRange": [{ "start": 1000, "end": 9995 }, { "start": 9995, "end": 10000 }, { "start": 10000, "end": 10001 }] }, { "name": "FeatureSetDefaults", "field": [{ "name": "defaults", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault" }, { "name": "minimum_edition", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "maximum_edition", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }], "nestedType": [{ "name": "FeatureSetEditionDefault", "field": [{ "name": "edition", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "overridable_features", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "fixed_features", "number": 5, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }] }] }, { "name": "SourceCodeInfo", "field": [{ "name": "location", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.SourceCodeInfo.Location" }], "nestedType": [{ "name": "Location", "field": [{ "name": "path", "number": 1, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "span", "number": 2, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "leading_comments", "number": 3, "type": 9, "label": 1 }, { "name": "trailing_comments", "number": 4, "type": 9, "label": 1 }, { "name": "leading_detached_comments", "number": 6, "type": 9, "label": 3 }] }], "extensionRange": [{ "start": 536000000, "end": 536000001 }] }, { "name": "GeneratedCodeInfo", "field": [{ "name": "annotation", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.GeneratedCodeInfo.Annotation" }], "nestedType": [{ "name": "Annotation", "field": [{ "name": "path", "number": 1, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "source_file", "number": 2, "type": 9, "label": 1 }, { "name": "begin", "number": 3, "type": 5, "label": 1 }, { "name": "end", "number": 4, "type": 5, "label": 1 }, { "name": "semantic", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.GeneratedCodeInfo.Annotation.Semantic" }], "enumType": [{ "name": "Semantic", "value": [{ "name": "NONE", "number": 0 }, { "name": "SET", "number": 1 }, { "name": "ALIAS", "number": 2 }] }] }] }], "enumType": [{ "name": "Edition", "value": [{ "name": "EDITION_UNKNOWN", "number": 0 }, { "name": "EDITION_LEGACY", "number": 900 }, { "name": "EDITION_PROTO2", "number": 998 }, { "name": "EDITION_PROTO3", "number": 999 }, { "name": "EDITION_2023", "number": 1000 }, { "name": "EDITION_2024", "number": 1001 }, { "name": "EDITION_1_TEST_ONLY", "number": 1 }, { "name": "EDITION_2_TEST_ONLY", "number": 2 }, { "name": "EDITION_99997_TEST_ONLY", "number": 99997 }, { "name": "EDITION_99998_TEST_ONLY", "number": 99998 }, { "name": "EDITION_99999_TEST_ONLY", "number": 99999 }, { "name": "EDITION_MAX", "number": 2147483647 }] }] });
/**
 * Describes the message google.protobuf.FileDescriptorProto.
 * Use `create(FileDescriptorProtoSchema)` to create a new message.
 */
const FileDescriptorProtoSchema = /*@__PURE__*/ messageDesc(file_google_protobuf_descriptor$1, 1);
/**
 * The verification state of the extension range.
 *
 * @generated from enum google.protobuf.ExtensionRangeOptions.VerificationState
 */
var ExtensionRangeOptions_VerificationState;
(function (ExtensionRangeOptions_VerificationState) {
    /**
     * All the extensions of the range must be declared.
     *
     * @generated from enum value: DECLARATION = 0;
     */
    ExtensionRangeOptions_VerificationState[ExtensionRangeOptions_VerificationState["DECLARATION"] = 0] = "DECLARATION";
    /**
     * @generated from enum value: UNVERIFIED = 1;
     */
    ExtensionRangeOptions_VerificationState[ExtensionRangeOptions_VerificationState["UNVERIFIED"] = 1] = "UNVERIFIED";
})(ExtensionRangeOptions_VerificationState || (ExtensionRangeOptions_VerificationState = {}));
/**
 * @generated from enum google.protobuf.FieldDescriptorProto.Type
 */
var FieldDescriptorProto_Type;
(function (FieldDescriptorProto_Type) {
    /**
     * 0 is reserved for errors.
     * Order is weird for historical reasons.
     *
     * @generated from enum value: TYPE_DOUBLE = 1;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["DOUBLE"] = 1] = "DOUBLE";
    /**
     * @generated from enum value: TYPE_FLOAT = 2;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["FLOAT"] = 2] = "FLOAT";
    /**
     * Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
     * negative values are likely.
     *
     * @generated from enum value: TYPE_INT64 = 3;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["INT64"] = 3] = "INT64";
    /**
     * @generated from enum value: TYPE_UINT64 = 4;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["UINT64"] = 4] = "UINT64";
    /**
     * Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
     * negative values are likely.
     *
     * @generated from enum value: TYPE_INT32 = 5;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["INT32"] = 5] = "INT32";
    /**
     * @generated from enum value: TYPE_FIXED64 = 6;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["FIXED64"] = 6] = "FIXED64";
    /**
     * @generated from enum value: TYPE_FIXED32 = 7;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["FIXED32"] = 7] = "FIXED32";
    /**
     * @generated from enum value: TYPE_BOOL = 8;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["BOOL"] = 8] = "BOOL";
    /**
     * @generated from enum value: TYPE_STRING = 9;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["STRING"] = 9] = "STRING";
    /**
     * Tag-delimited aggregate.
     * Group type is deprecated and not supported after google.protobuf. However, Proto3
     * implementations should still be able to parse the group wire format and
     * treat group fields as unknown fields.  In Editions, the group wire format
     * can be enabled via the `message_encoding` feature.
     *
     * @generated from enum value: TYPE_GROUP = 10;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["GROUP"] = 10] = "GROUP";
    /**
     * Length-delimited aggregate.
     *
     * @generated from enum value: TYPE_MESSAGE = 11;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["MESSAGE"] = 11] = "MESSAGE";
    /**
     * New in version 2.
     *
     * @generated from enum value: TYPE_BYTES = 12;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["BYTES"] = 12] = "BYTES";
    /**
     * @generated from enum value: TYPE_UINT32 = 13;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["UINT32"] = 13] = "UINT32";
    /**
     * @generated from enum value: TYPE_ENUM = 14;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["ENUM"] = 14] = "ENUM";
    /**
     * @generated from enum value: TYPE_SFIXED32 = 15;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SFIXED32"] = 15] = "SFIXED32";
    /**
     * @generated from enum value: TYPE_SFIXED64 = 16;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SFIXED64"] = 16] = "SFIXED64";
    /**
     * Uses ZigZag encoding.
     *
     * @generated from enum value: TYPE_SINT32 = 17;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SINT32"] = 17] = "SINT32";
    /**
     * Uses ZigZag encoding.
     *
     * @generated from enum value: TYPE_SINT64 = 18;
     */
    FieldDescriptorProto_Type[FieldDescriptorProto_Type["SINT64"] = 18] = "SINT64";
})(FieldDescriptorProto_Type || (FieldDescriptorProto_Type = {}));
/**
 * @generated from enum google.protobuf.FieldDescriptorProto.Label
 */
var FieldDescriptorProto_Label;
(function (FieldDescriptorProto_Label) {
    /**
     * 0 is reserved for errors
     *
     * @generated from enum value: LABEL_OPTIONAL = 1;
     */
    FieldDescriptorProto_Label[FieldDescriptorProto_Label["OPTIONAL"] = 1] = "OPTIONAL";
    /**
     * @generated from enum value: LABEL_REPEATED = 3;
     */
    FieldDescriptorProto_Label[FieldDescriptorProto_Label["REPEATED"] = 3] = "REPEATED";
    /**
     * The required label is only allowed in google.protobuf.  In proto3 and Editions
     * it's explicitly prohibited.  In Editions, the `field_presence` feature
     * can be used to get this behavior.
     *
     * @generated from enum value: LABEL_REQUIRED = 2;
     */
    FieldDescriptorProto_Label[FieldDescriptorProto_Label["REQUIRED"] = 2] = "REQUIRED";
})(FieldDescriptorProto_Label || (FieldDescriptorProto_Label = {}));
/**
 * Generated classes can be optimized for speed or code size.
 *
 * @generated from enum google.protobuf.FileOptions.OptimizeMode
 */
var FileOptions_OptimizeMode;
(function (FileOptions_OptimizeMode) {
    /**
     * Generate complete code for parsing, serialization,
     *
     * @generated from enum value: SPEED = 1;
     */
    FileOptions_OptimizeMode[FileOptions_OptimizeMode["SPEED"] = 1] = "SPEED";
    /**
     * etc.
     *
     * Use ReflectionOps to implement these methods.
     *
     * @generated from enum value: CODE_SIZE = 2;
     */
    FileOptions_OptimizeMode[FileOptions_OptimizeMode["CODE_SIZE"] = 2] = "CODE_SIZE";
    /**
     * Generate code using MessageLite and the lite runtime.
     *
     * @generated from enum value: LITE_RUNTIME = 3;
     */
    FileOptions_OptimizeMode[FileOptions_OptimizeMode["LITE_RUNTIME"] = 3] = "LITE_RUNTIME";
})(FileOptions_OptimizeMode || (FileOptions_OptimizeMode = {}));
/**
 * @generated from enum google.protobuf.FieldOptions.CType
 */
var FieldOptions_CType;
(function (FieldOptions_CType) {
    /**
     * Default mode.
     *
     * @generated from enum value: STRING = 0;
     */
    FieldOptions_CType[FieldOptions_CType["STRING"] = 0] = "STRING";
    /**
     * The option [ctype=CORD] may be applied to a non-repeated field of type
     * "bytes". It indicates that in C++, the data should be stored in a Cord
     * instead of a string.  For very large strings, this may reduce memory
     * fragmentation. It may also allow better performance when parsing from a
     * Cord, or when parsing with aliasing enabled, as the parsed Cord may then
     * alias the original buffer.
     *
     * @generated from enum value: CORD = 1;
     */
    FieldOptions_CType[FieldOptions_CType["CORD"] = 1] = "CORD";
    /**
     * @generated from enum value: STRING_PIECE = 2;
     */
    FieldOptions_CType[FieldOptions_CType["STRING_PIECE"] = 2] = "STRING_PIECE";
})(FieldOptions_CType || (FieldOptions_CType = {}));
/**
 * @generated from enum google.protobuf.FieldOptions.JSType
 */
var FieldOptions_JSType;
(function (FieldOptions_JSType) {
    /**
     * Use the default type.
     *
     * @generated from enum value: JS_NORMAL = 0;
     */
    FieldOptions_JSType[FieldOptions_JSType["JS_NORMAL"] = 0] = "JS_NORMAL";
    /**
     * Use JavaScript strings.
     *
     * @generated from enum value: JS_STRING = 1;
     */
    FieldOptions_JSType[FieldOptions_JSType["JS_STRING"] = 1] = "JS_STRING";
    /**
     * Use JavaScript numbers.
     *
     * @generated from enum value: JS_NUMBER = 2;
     */
    FieldOptions_JSType[FieldOptions_JSType["JS_NUMBER"] = 2] = "JS_NUMBER";
})(FieldOptions_JSType || (FieldOptions_JSType = {}));
/**
 * If set to RETENTION_SOURCE, the option will be omitted from the binary.
 *
 * @generated from enum google.protobuf.FieldOptions.OptionRetention
 */
var FieldOptions_OptionRetention;
(function (FieldOptions_OptionRetention) {
    /**
     * @generated from enum value: RETENTION_UNKNOWN = 0;
     */
    FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_UNKNOWN"] = 0] = "RETENTION_UNKNOWN";
    /**
     * @generated from enum value: RETENTION_RUNTIME = 1;
     */
    FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_RUNTIME"] = 1] = "RETENTION_RUNTIME";
    /**
     * @generated from enum value: RETENTION_SOURCE = 2;
     */
    FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_SOURCE"] = 2] = "RETENTION_SOURCE";
})(FieldOptions_OptionRetention || (FieldOptions_OptionRetention = {}));
/**
 * This indicates the types of entities that the field may apply to when used
 * as an option. If it is unset, then the field may be freely used as an
 * option on any kind of entity.
 *
 * @generated from enum google.protobuf.FieldOptions.OptionTargetType
 */
var FieldOptions_OptionTargetType;
(function (FieldOptions_OptionTargetType) {
    /**
     * @generated from enum value: TARGET_TYPE_UNKNOWN = 0;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_UNKNOWN"] = 0] = "TARGET_TYPE_UNKNOWN";
    /**
     * @generated from enum value: TARGET_TYPE_FILE = 1;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_FILE"] = 1] = "TARGET_TYPE_FILE";
    /**
     * @generated from enum value: TARGET_TYPE_EXTENSION_RANGE = 2;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_EXTENSION_RANGE"] = 2] = "TARGET_TYPE_EXTENSION_RANGE";
    /**
     * @generated from enum value: TARGET_TYPE_MESSAGE = 3;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_MESSAGE"] = 3] = "TARGET_TYPE_MESSAGE";
    /**
     * @generated from enum value: TARGET_TYPE_FIELD = 4;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_FIELD"] = 4] = "TARGET_TYPE_FIELD";
    /**
     * @generated from enum value: TARGET_TYPE_ONEOF = 5;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ONEOF"] = 5] = "TARGET_TYPE_ONEOF";
    /**
     * @generated from enum value: TARGET_TYPE_ENUM = 6;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ENUM"] = 6] = "TARGET_TYPE_ENUM";
    /**
     * @generated from enum value: TARGET_TYPE_ENUM_ENTRY = 7;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ENUM_ENTRY"] = 7] = "TARGET_TYPE_ENUM_ENTRY";
    /**
     * @generated from enum value: TARGET_TYPE_SERVICE = 8;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_SERVICE"] = 8] = "TARGET_TYPE_SERVICE";
    /**
     * @generated from enum value: TARGET_TYPE_METHOD = 9;
     */
    FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_METHOD"] = 9] = "TARGET_TYPE_METHOD";
})(FieldOptions_OptionTargetType || (FieldOptions_OptionTargetType = {}));
/**
 * Is this method side-effect-free (or safe in HTTP parlance), or idempotent,
 * or neither? HTTP based RPC implementation may choose GET verb for safe
 * methods, and PUT verb for idempotent methods instead of the default POST.
 *
 * @generated from enum google.protobuf.MethodOptions.IdempotencyLevel
 */
var MethodOptions_IdempotencyLevel;
(function (MethodOptions_IdempotencyLevel) {
    /**
     * @generated from enum value: IDEMPOTENCY_UNKNOWN = 0;
     */
    MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["IDEMPOTENCY_UNKNOWN"] = 0] = "IDEMPOTENCY_UNKNOWN";
    /**
     * implies idempotent
     *
     * @generated from enum value: NO_SIDE_EFFECTS = 1;
     */
    MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["NO_SIDE_EFFECTS"] = 1] = "NO_SIDE_EFFECTS";
    /**
     * idempotent, but may have side effects
     *
     * @generated from enum value: IDEMPOTENT = 2;
     */
    MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["IDEMPOTENT"] = 2] = "IDEMPOTENT";
})(MethodOptions_IdempotencyLevel || (MethodOptions_IdempotencyLevel = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.FieldPresence
 */
var FeatureSet_FieldPresence;
(function (FeatureSet_FieldPresence) {
    /**
     * @generated from enum value: FIELD_PRESENCE_UNKNOWN = 0;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["FIELD_PRESENCE_UNKNOWN"] = 0] = "FIELD_PRESENCE_UNKNOWN";
    /**
     * @generated from enum value: EXPLICIT = 1;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["EXPLICIT"] = 1] = "EXPLICIT";
    /**
     * @generated from enum value: IMPLICIT = 2;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["IMPLICIT"] = 2] = "IMPLICIT";
    /**
     * @generated from enum value: LEGACY_REQUIRED = 3;
     */
    FeatureSet_FieldPresence[FeatureSet_FieldPresence["LEGACY_REQUIRED"] = 3] = "LEGACY_REQUIRED";
})(FeatureSet_FieldPresence || (FeatureSet_FieldPresence = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.EnumType
 */
var FeatureSet_EnumType;
(function (FeatureSet_EnumType) {
    /**
     * @generated from enum value: ENUM_TYPE_UNKNOWN = 0;
     */
    FeatureSet_EnumType[FeatureSet_EnumType["ENUM_TYPE_UNKNOWN"] = 0] = "ENUM_TYPE_UNKNOWN";
    /**
     * @generated from enum value: OPEN = 1;
     */
    FeatureSet_EnumType[FeatureSet_EnumType["OPEN"] = 1] = "OPEN";
    /**
     * @generated from enum value: CLOSED = 2;
     */
    FeatureSet_EnumType[FeatureSet_EnumType["CLOSED"] = 2] = "CLOSED";
})(FeatureSet_EnumType || (FeatureSet_EnumType = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.RepeatedFieldEncoding
 */
var FeatureSet_RepeatedFieldEncoding;
(function (FeatureSet_RepeatedFieldEncoding) {
    /**
     * @generated from enum value: REPEATED_FIELD_ENCODING_UNKNOWN = 0;
     */
    FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["REPEATED_FIELD_ENCODING_UNKNOWN"] = 0] = "REPEATED_FIELD_ENCODING_UNKNOWN";
    /**
     * @generated from enum value: PACKED = 1;
     */
    FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["PACKED"] = 1] = "PACKED";
    /**
     * @generated from enum value: EXPANDED = 2;
     */
    FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["EXPANDED"] = 2] = "EXPANDED";
})(FeatureSet_RepeatedFieldEncoding || (FeatureSet_RepeatedFieldEncoding = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.Utf8Validation
 */
var FeatureSet_Utf8Validation;
(function (FeatureSet_Utf8Validation) {
    /**
     * @generated from enum value: UTF8_VALIDATION_UNKNOWN = 0;
     */
    FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["UTF8_VALIDATION_UNKNOWN"] = 0] = "UTF8_VALIDATION_UNKNOWN";
    /**
     * @generated from enum value: VERIFY = 2;
     */
    FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["VERIFY"] = 2] = "VERIFY";
    /**
     * @generated from enum value: NONE = 3;
     */
    FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["NONE"] = 3] = "NONE";
})(FeatureSet_Utf8Validation || (FeatureSet_Utf8Validation = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.MessageEncoding
 */
var FeatureSet_MessageEncoding;
(function (FeatureSet_MessageEncoding) {
    /**
     * @generated from enum value: MESSAGE_ENCODING_UNKNOWN = 0;
     */
    FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["MESSAGE_ENCODING_UNKNOWN"] = 0] = "MESSAGE_ENCODING_UNKNOWN";
    /**
     * @generated from enum value: LENGTH_PREFIXED = 1;
     */
    FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["LENGTH_PREFIXED"] = 1] = "LENGTH_PREFIXED";
    /**
     * @generated from enum value: DELIMITED = 2;
     */
    FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["DELIMITED"] = 2] = "DELIMITED";
})(FeatureSet_MessageEncoding || (FeatureSet_MessageEncoding = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.JsonFormat
 */
var FeatureSet_JsonFormat;
(function (FeatureSet_JsonFormat) {
    /**
     * @generated from enum value: JSON_FORMAT_UNKNOWN = 0;
     */
    FeatureSet_JsonFormat[FeatureSet_JsonFormat["JSON_FORMAT_UNKNOWN"] = 0] = "JSON_FORMAT_UNKNOWN";
    /**
     * @generated from enum value: ALLOW = 1;
     */
    FeatureSet_JsonFormat[FeatureSet_JsonFormat["ALLOW"] = 1] = "ALLOW";
    /**
     * @generated from enum value: LEGACY_BEST_EFFORT = 2;
     */
    FeatureSet_JsonFormat[FeatureSet_JsonFormat["LEGACY_BEST_EFFORT"] = 2] = "LEGACY_BEST_EFFORT";
})(FeatureSet_JsonFormat || (FeatureSet_JsonFormat = {}));
/**
 * @generated from enum google.protobuf.FeatureSet.EnforceNamingStyle
 */
var FeatureSet_EnforceNamingStyle;
(function (FeatureSet_EnforceNamingStyle) {
    /**
     * @generated from enum value: ENFORCE_NAMING_STYLE_UNKNOWN = 0;
     */
    FeatureSet_EnforceNamingStyle[FeatureSet_EnforceNamingStyle["ENFORCE_NAMING_STYLE_UNKNOWN"] = 0] = "ENFORCE_NAMING_STYLE_UNKNOWN";
    /**
     * @generated from enum value: STYLE2024 = 1;
     */
    FeatureSet_EnforceNamingStyle[FeatureSet_EnforceNamingStyle["STYLE2024"] = 1] = "STYLE2024";
    /**
     * @generated from enum value: STYLE_LEGACY = 2;
     */
    FeatureSet_EnforceNamingStyle[FeatureSet_EnforceNamingStyle["STYLE_LEGACY"] = 2] = "STYLE_LEGACY";
})(FeatureSet_EnforceNamingStyle || (FeatureSet_EnforceNamingStyle = {}));
/**
 * Represents the identified object's effect on the element in the original
 * .proto file.
 *
 * @generated from enum google.protobuf.GeneratedCodeInfo.Annotation.Semantic
 */
var GeneratedCodeInfo_Annotation_Semantic;
(function (GeneratedCodeInfo_Annotation_Semantic) {
    /**
     * There is no effect or the effect is indescribable.
     *
     * @generated from enum value: NONE = 0;
     */
    GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["NONE"] = 0] = "NONE";
    /**
     * The element is set or otherwise mutated.
     *
     * @generated from enum value: SET = 1;
     */
    GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["SET"] = 1] = "SET";
    /**
     * An alias to the element is returned.
     *
     * @generated from enum value: ALIAS = 2;
     */
    GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["ALIAS"] = 2] = "ALIAS";
})(GeneratedCodeInfo_Annotation_Semantic || (GeneratedCodeInfo_Annotation_Semantic = {}));
/**
 * The full set of known editions.
 *
 * @generated from enum google.protobuf.Edition
 */
var Edition;
(function (Edition) {
    /**
     * A placeholder for an unknown edition value.
     *
     * @generated from enum value: EDITION_UNKNOWN = 0;
     */
    Edition[Edition["EDITION_UNKNOWN"] = 0] = "EDITION_UNKNOWN";
    /**
     * A placeholder edition for specifying default behaviors *before* a feature
     * was first introduced.  This is effectively an "infinite past".
     *
     * @generated from enum value: EDITION_LEGACY = 900;
     */
    Edition[Edition["EDITION_LEGACY"] = 900] = "EDITION_LEGACY";
    /**
     * Legacy syntax "editions".  These pre-date editions, but behave much like
     * distinct editions.  These can't be used to specify the edition of proto
     * files, but feature definitions must supply proto2/proto3 defaults for
     * backwards compatibility.
     *
     * @generated from enum value: EDITION_PROTO2 = 998;
     */
    Edition[Edition["EDITION_PROTO2"] = 998] = "EDITION_PROTO2";
    /**
     * @generated from enum value: EDITION_PROTO3 = 999;
     */
    Edition[Edition["EDITION_PROTO3"] = 999] = "EDITION_PROTO3";
    /**
     * Editions that have been released.  The specific values are arbitrary and
     * should not be depended on, but they will always be time-ordered for easy
     * comparison.
     *
     * @generated from enum value: EDITION_2023 = 1000;
     */
    Edition[Edition["EDITION_2023"] = 1000] = "EDITION_2023";
    /**
     * @generated from enum value: EDITION_2024 = 1001;
     */
    Edition[Edition["EDITION_2024"] = 1001] = "EDITION_2024";
    /**
     * Placeholder editions for testing feature resolution.  These should not be
     * used or relied on outside of tests.
     *
     * @generated from enum value: EDITION_1_TEST_ONLY = 1;
     */
    Edition[Edition["EDITION_1_TEST_ONLY"] = 1] = "EDITION_1_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_2_TEST_ONLY = 2;
     */
    Edition[Edition["EDITION_2_TEST_ONLY"] = 2] = "EDITION_2_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_99997_TEST_ONLY = 99997;
     */
    Edition[Edition["EDITION_99997_TEST_ONLY"] = 99997] = "EDITION_99997_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_99998_TEST_ONLY = 99998;
     */
    Edition[Edition["EDITION_99998_TEST_ONLY"] = 99998] = "EDITION_99998_TEST_ONLY";
    /**
     * @generated from enum value: EDITION_99999_TEST_ONLY = 99999;
     */
    Edition[Edition["EDITION_99999_TEST_ONLY"] = 99999] = "EDITION_99999_TEST_ONLY";
    /**
     * Placeholder for specifying unbounded edition support.  This should only
     * ever be used by plugins that can expect to never require any changes to
     * support a new edition.
     *
     * @generated from enum value: EDITION_MAX = 2147483647;
     */
    Edition[Edition["EDITION_MAX"] = 2147483647] = "EDITION_MAX";
})(Edition || (Edition = {}));

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Hydrate a file descriptor.
 *
 * @private
 */
function fileDesc(b64, imports) {
    var _a;
    const root = fromBinary(FileDescriptorProtoSchema, base64Decode(b64));
    root.messageType.forEach(restoreJsonNames);
    root.dependency = (_a = imports === null || imports === void 0 ? void 0 : imports.map((f) => f.proto.name)) !== null && _a !== void 0 ? _a : [];
    const reg = createFileRegistry(root, (protoFileName) => imports === null || imports === void 0 ? void 0 : imports.find((f) => f.proto.name === protoFileName));
    // biome-ignore lint/style/noNonNullAssertion: non-null assertion because we just created the registry from the file we look up
    return reg.getFile(root.name);
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Hydrate a service descriptor.
 *
 * @private
 */
function serviceDesc(file, path, ...paths) {
    if (paths.length > 0) {
        throw new Error();
    }
    return file.services[path];
}

// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Describes the file google/protobuf/any.proto.
 */
const file_google_protobuf_any = /*@__PURE__*/ fileDesc("Chlnb29nbGUvcHJvdG9idWYvYW55LnByb3RvEg9nb29nbGUucHJvdG9idWYiJgoDQW55EhAKCHR5cGVfdXJsGAEgASgJEg0KBXZhbHVlGAIgASgMQnYKE2NvbS5nb29nbGUucHJvdG9idWZCCEFueVByb3RvUAFaLGdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2FueXBiogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Describes the file status.proto.
 */
const file_status = /*@__PURE__*/ fileDesc("CgxzdGF0dXMucHJvdG8SCmdvb2dsZS5ycGMiTgoGU3RhdHVzEgwKBGNvZGUYASABKAUSDwoHbWVzc2FnZRgCIAEoCRIlCgdkZXRhaWxzGAMgAygLMhQuZ29vZ2xlLnByb3RvYnVmLkFueUJeCg5jb20uZ29vZ2xlLnJwY0ILU3RhdHVzUHJvdG9QAVo3Z29vZ2xlLmdvbGFuZy5vcmcvZ2VucHJvdG8vZ29vZ2xlYXBpcy9ycGMvc3RhdHVzO3N0YXR1c6ICA1JQQ2IGcHJvdG8z", [file_google_protobuf_any]);
/**
 * Describes the message google.rpc.Status.
 * Use `create(StatusSchema)` to create a new message.
 */
const StatusSchema = /*@__PURE__*/ messageDesc(file_status, 0);

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * The value of the Grpc-Status header or trailer in case of success.
 * Used by the gRPC and gRPC-web protocols.
 *
 * @private Internal code, does not follow semantic versioning.
 */
const grpcStatusOk = "0";
/**
 * Find an error status in the given Headers object, which can be either
 * a trailer, or a header (as allowed for so-called trailers-only responses).
 * The field "grpc-status-details-bin" is inspected, and if not present,
 * the fields "grpc-status" and "grpc-message" are used.
 * Returns an error only if the gRPC status code is > 0.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function findTrailerError(headerOrTrailer) {
    // TODO
    // let code: Code;
    // let message: string = "";
    var _a;
    // Prefer the protobuf-encoded data to the grpc-status header.
    const statusBytes = headerOrTrailer.get(headerStatusDetailsBin);
    if (statusBytes != null) {
        const status = decodeBinaryHeader(statusBytes, StatusSchema);
        if (status.code == 0) {
            return undefined;
        }
        const error = new ConnectError(status.message, status.code, headerOrTrailer);
        error.details = status.details.map((any) => ({
            type: any.typeUrl.substring(any.typeUrl.lastIndexOf("/") + 1),
            value: any.value,
        }));
        return error;
    }
    const grpcStatus = headerOrTrailer.get(headerGrpcStatus);
    if (grpcStatus != null) {
        if (grpcStatus === grpcStatusOk) {
            return undefined;
        }
        const code = parseInt(grpcStatus, 10);
        if (code in Code) {
            return new ConnectError(decodeURIComponent((_a = headerOrTrailer.get(headerGrpcMessage)) !== null && _a !== void 0 ? _a : ""), code, headerOrTrailer);
        }
        return new ConnectError(`invalid grpc-status: ${grpcStatus}`, Code.Internal, headerOrTrailer);
    }
    return undefined;
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Create a URL for the given RPC. This simply adds the qualified
 * service name, a slash, and the method name to the path of the given
 * baseUrl.
 *
 * For example, the baseUri https://example.com and method "Say" from
 * the service example.ElizaService results in:
 * https://example.com/example.ElizaService/Say
 *
 * This format is used by the protocols Connect, gRPC and Twirp.
 *
 * Note that this function also accepts a protocol-relative baseUrl.
 * If given an empty string or "/" as a baseUrl, it returns just the
 * path.
 */
function createMethodUrl(baseUrl, method) {
    return baseUrl
        .toString()
        .replace(/\/?$/, `/${method.parent.typeName}/${method.name}`);
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 *  Takes a partial protobuf messages of the
 *  specified message type as input, and returns full instances.
 */
function normalize(desc, message) {
    return protobuf.create(desc, message);
}
/**
 * Takes an AsyncIterable of partial protobuf messages of the
 * specified message type as input, and yields full instances.
 */
function normalizeIterable(desc, input) {
    function transform(result) {
        if (result.done === true) {
            return result;
        }
        return {
            done: result.done,
            value: normalize(desc, result.value),
        };
    }
    return {
        [Symbol.asyncIterator]() {
            const it = input[Symbol.asyncIterator]();
            const res = {
                next: () => it.next().then(transform),
            };
            if (it.throw !== undefined) {
                res.throw = (e) => it.throw(e).then(transform); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
            if (it.return !== undefined) {
                res.return = (v) => it.return(v).then(transform); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
            return res;
        },
    };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * applyInterceptors takes the given UnaryFn or ServerStreamingFn, and wraps
 * it with each of the given interceptors, returning a new UnaryFn or
 * ServerStreamingFn.
 */
function applyInterceptors(next, interceptors) {
    var _a;
    return ((_a = interceptors === null || interceptors === void 0 ? void 0 : interceptors.concat().reverse().reduce(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    (n, i) => i(n), next)) !== null && _a !== void 0 ? _a : next);
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Sets default JSON serialization options for connect-es.
 *
 * With standard protobuf JSON serialization, unknown JSON fields are
 * rejected by default. In connect-es, unknown JSON fields are ignored
 * by default.
 */
function getJsonOptions(options) {
    var _a;
    const o = Object.assign({}, options);
    (_a = o.ignoreUnknownFields) !== null && _a !== void 0 ? _a : (o.ignoreUnknownFields = true);
    return o;
}
/**
 * Create an object that provides convenient access to request and response
 * message serialization for a given method.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createMethodSerializationLookup(method, binaryOptions, jsonOptions, limitOptions) {
    const inputBinary = limitSerialization(createBinarySerialization(method.input, binaryOptions), limitOptions);
    const inputJson = limitSerialization(createJsonSerialization(method.input, jsonOptions), limitOptions);
    const outputBinary = limitSerialization(createBinarySerialization(method.output, binaryOptions), limitOptions);
    const outputJson = limitSerialization(createJsonSerialization(method.output, jsonOptions), limitOptions);
    return {
        getI(useBinaryFormat) {
            return useBinaryFormat ? inputBinary : inputJson;
        },
        getO(useBinaryFormat) {
            return useBinaryFormat ? outputBinary : outputJson;
        },
    };
}
/**
 * Apply I/O limits to a Serialization object, returning a new object.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function limitSerialization(serialization, limitOptions) {
    return {
        serialize(data) {
            const bytes = serialization.serialize(data);
            assertWriteMaxBytes(limitOptions.writeMaxBytes, bytes.byteLength);
            return bytes;
        },
        parse(data) {
            assertReadMaxBytes(limitOptions.readMaxBytes, data.byteLength, true);
            return serialization.parse(data);
        },
    };
}
/**
 * Creates a Serialization object for serializing the given protobuf message
 * with the protobuf binary format.
 */
function createBinarySerialization(desc, options) {
    return {
        parse(data) {
            try {
                return protobuf.fromBinary(desc, data, options);
            }
            catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                throw new ConnectError(`parse binary: ${m}`, Code.Internal);
            }
        },
        serialize(data) {
            try {
                return protobuf.toBinary(desc, data, options);
            }
            catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                throw new ConnectError(`serialize binary: ${m}`, Code.Internal);
            }
        },
    };
}
/**
 * Creates a Serialization object for serializing the given protobuf message
 * with the protobuf canonical JSON encoding.
 *
 * By default, unknown fields are ignored.
 */
function createJsonSerialization(desc, options) {
    var _a, _b;
    const textEncoder = (_a = options === null || options === void 0 ? void 0 : options.textEncoder) !== null && _a !== void 0 ? _a : new TextEncoder();
    const textDecoder = (_b = options === null || options === void 0 ? void 0 : options.textDecoder) !== null && _b !== void 0 ? _b : new TextDecoder();
    const o = getJsonOptions(options);
    return {
        parse(data) {
            try {
                const json = textDecoder.decode(data);
                return protobuf.fromJsonString(desc, json, o);
            }
            catch (e) {
                throw ConnectError.from(e, Code.InvalidArgument);
            }
        },
        serialize(data) {
            try {
                const json = protobuf.toJsonString(desc, data, o);
                return textEncoder.encode(json);
            }
            catch (e) {
                throw ConnectError.from(e, Code.Internal);
            }
        },
    };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Regular Expression that matches any valid gRPC Content-Type header value.
 *
 * @private Internal code, does not follow semantic versioning.
 */
const contentTypeRegExp = /^application\/grpc(?:\+(?:(json)(?:; ?charset=utf-?8)?|proto))?$/i;
const contentTypeProto = "application/grpc+proto";
const contentTypeJson = "application/grpc+json";
/**
 * Parse a gRPC Content-Type header.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function parseContentType(contentType) {
    const match = contentType === null || contentType === void 0 ? void 0 : contentType.match(contentTypeRegExp);
    if (!match) {
        return undefined;
    }
    const binary = !match[1];
    return { binary };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Runs a unary method with the given interceptors. Note that this function
 * is only used when implementing a Transport.
 */
function runUnaryCall(opt) {
    const next = applyInterceptors(opt.next, opt.interceptors);
    const [signal, abort, done] = setupSignal(opt);
    const req = Object.assign(Object.assign({}, opt.req), { message: normalize(opt.req.method.input, opt.req.message), signal });
    return next(req).then((res) => {
        done();
        return res;
    }, abort);
}
/**
 * Runs a server-streaming method with the given interceptors. Note that this
 * function is only used when implementing a Transport.
 */
function runStreamingCall(opt) {
    const next = applyInterceptors(opt.next, opt.interceptors);
    const [signal, abort, done] = setupSignal(opt);
    const req = Object.assign(Object.assign({}, opt.req), { message: normalizeIterable(opt.req.method.input, opt.req.message), signal });
    let doneCalled = false;
    // Call return on the request iterable to indicate
    // that we will no longer consume it and it should
    // cleanup any allocated resources.
    signal.addEventListener("abort", function () {
        var _a, _b;
        const it = opt.req.message[Symbol.asyncIterator]();
        // If the signal is aborted due to an error, we want to throw
        // the error to the request iterator.
        if (!doneCalled) {
            (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, this.reason).catch(() => {
                // throw returns a promise, which we don't care about.
                //
                // Uncaught promises are thrown at sometime/somewhere by the event loop,
                // this is to ensure error is caught and ignored.
            });
        }
        (_b = it.return) === null || _b === void 0 ? void 0 : _b.call(it).catch(() => {
            // return returns a promise, which we don't care about.
            //
            // Uncaught promises are thrown at sometime/somewhere by the event loop,
            // this is to ensure error is caught and ignored.
        });
    });
    return next(req).then((res) => {
        return Object.assign(Object.assign({}, res), { message: {
                [Symbol.asyncIterator]() {
                    const it = res.message[Symbol.asyncIterator]();
                    return {
                        next() {
                            return it.next().then((r) => {
                                if (r.done == true) {
                                    doneCalled = true;
                                    done();
                                }
                                return r;
                            }, abort);
                        },
                        // We deliberately omit throw/return.
                    };
                },
            } });
    }, abort);
}
/**
 * Create an AbortSignal for Transport implementations. The signal is available
 * in UnaryRequest and StreamingRequest, and is triggered when the call is
 * aborted (via a timeout or explicit cancellation), errored (e.g. when reading
 * an error from the server from the wire), or finished successfully.
 *
 * Transport implementations can pass the signal to HTTP clients to ensure that
 * there are no unused connections leak.
 *
 * Returns a tuple:
 * [0]: The signal, which is also aborted if the optional deadline is reached.
 * [1]: Function to call if the Transport encountered an error.
 * [2]: Function to call if the Transport finished without an error.
 */
function setupSignal(opt) {
    const { signal, cleanup } = createDeadlineSignal(opt.timeoutMs);
    const controller = createLinkedAbortController(opt.signal, signal);
    return [
        controller.signal,
        function abort(reason) {
            // We peek at the deadline signal because fetch() will throw an error on
            // abort that discards the signal reason.
            const e = ConnectError.from(signal.aborted ? getAbortSignalReason(signal) : reason);
            controller.abort(e);
            cleanup();
            return Promise.reject(e);
        },
        function done() {
            cleanup();
            controller.abort();
        },
    ];
}

class AppConfig {
    storageBaseUrl;
    orderBaseUrl;
    storageGrpcBaseUrl;
    orderGrpcBaseUrl;
    verifierAuthPk;
    constructor(storageBaseUrl, orderBaseUrl, storageGrpcBaseUrl, orderGrpcBaseUrl, verifierAuthPk) {
        this.storageBaseUrl = storageBaseUrl;
        this.orderBaseUrl = orderBaseUrl;
        this.storageGrpcBaseUrl = storageGrpcBaseUrl;
        this.orderGrpcBaseUrl = orderGrpcBaseUrl;
        this.verifierAuthPk = verifierAuthPk;
    }
    static demo() {
        return new AppConfig('https://storage-demo.brij.fi/', 'https://orders-demo.brij.fi/', 'https://storage-grpc-demo.brij.fi', 'https://orders-grpc-demo.brij.fi', 'HHV5joB6D4c2pigVZcQ9RY5suDMvAiHBLLBCFqmWuM4E');
    }
    static production() {
        return new AppConfig('https://storage.brij.fi/', 'https://orders.brij.fi/', 'https://storage-grpc.brij.fi', 'https://orders-grpc.brij.fi', '88tFG8dt9ZacDZb7QP5yiDQeA7sVXvr7XCwZEQSsnCkJ');
    }
    static custom({ storageBaseUrl, orderBaseUrl, storageGrpcBaseUrl, orderGrpcBaseUrl, verifierAuthPk, }) {
        return new AppConfig(storageBaseUrl, orderBaseUrl, storageGrpcBaseUrl, orderGrpcBaseUrl, verifierAuthPk);
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Validates a trailer for the gRPC and the gRPC-web protocol.
 *
 * If the trailer contains an error status, a ConnectError is
 * thrown. It will include trailer and header in the error's
 * "metadata" property.
 *
 * Throws a ConnectError with code "internal" if neither the trailer
 * nor the header contain the Grpc-Status field.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateTrailer(trailer, header) {
    const err = findTrailerError(trailer);
    if (err) {
        header.forEach((value, key) => {
            err.metadata.append(key, value);
        });
        throw err;
    }
    if (!header.has(headerGrpcStatus) && !trailer.has(headerGrpcStatus)) {
        throw new ConnectError("protocol error: missing status", Code.Internal);
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Determine the gRPC-web error code for the given HTTP status code.
 * See https://github.com/grpc/grpc/blob/master/doc/http-grpc-status-mapping.md.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function codeFromHttpStatus(httpStatus) {
    switch (httpStatus) {
        case 400: // Bad Request
            return Code.Internal;
        case 401: // Unauthorized
            return Code.Unauthenticated;
        case 403: // Forbidden
            return Code.PermissionDenied;
        case 404: // Not Found
            return Code.Unimplemented;
        case 429: // Too Many Requests
            return Code.Unavailable;
        case 502: // Bad Gateway
            return Code.Unavailable;
        case 503: // Service Unavailable
            return Code.Unavailable;
        case 504: // Gateway Timeout
            return Code.Unavailable;
        default:
            // 200 is UNKNOWN because there should be a grpc-status in case of truly OK response.
            return Code.Unknown;
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Creates headers for a gRPC request.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function requestHeader(useBinaryFormat, timeoutMs, userProvidedHeaders) {
    const result = new Headers(userProvidedHeaders !== null && userProvidedHeaders !== void 0 ? userProvidedHeaders : {});
    result.set(headerContentType, useBinaryFormat ? contentTypeProto : contentTypeJson);
    if (!result.has(headerUserAgent)) {
        // Note that we do not strictly comply with gRPC user agents.
        // We use "connect-es/1.2.3" where gRPC would use "grpc-es/1.2.3".
        // See https://github.com/grpc/grpc/blob/c462bb8d485fc1434ecfae438823ca8d14cf3154/doc/PROTOCOL-HTTP2.md#user-agents
        result.set(headerUserAgent, "connect-es/2.0.2");
    }
    if (timeoutMs !== undefined) {
        result.set(headerTimeout, `${timeoutMs}m`);
    }
    // The gRPC-HTTP2 specification requires this - it flushes out proxies that
    // don't support HTTP trailers.
    result.set("Te", "trailers");
    return result;
}
/**
 * Creates headers for a gRPC request with compression.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function requestHeaderWithCompression(useBinaryFormat, timeoutMs, userProvidedHeaders, acceptCompression, sendCompression) {
    const result = requestHeader(useBinaryFormat, timeoutMs, userProvidedHeaders);
    if (sendCompression != null) {
        result.set(headerEncoding, sendCompression.name);
    }
    if (acceptCompression.length > 0) {
        result.set(headerAcceptEncoding, acceptCompression.map((c) => c.name).join(","));
    }
    return result;
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Validates response status and header for the gRPC protocol.
 * Throws a ConnectError if the header contains an error status,
 * or if the HTTP status indicates an error.
 *
 * Returns an object that indicates whether a gRPC status was found
 * in the response header. In this case, clients can not expect a
 * trailer.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateResponse(status, headers) {
    if (status != 200) {
        throw new ConnectError(`HTTP ${status}`, codeFromHttpStatus(status), headers);
    }
    const mimeType = headers.get(headerContentType);
    const parsedType = parseContentType(mimeType);
    if (parsedType == undefined) {
        throw new ConnectError(`unsupported content type ${mimeType}`, Code.Unknown);
    }
    return {
        foundStatus: headers.has(headerGrpcStatus),
        headerError: findTrailerError(headers),
    };
}
/**
 * Validates response status and header for the gRPC protocol.
 * This function is identical to validateResponse(), but also verifies
 * that a given encoding header is acceptable.
 *
 * Returns an object with the response compression, and a boolean
 * indicating whether a gRPC status was found in the response header
 * (in this case, clients can not expect a trailer).
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateResponseWithCompression(acceptCompression, status, headers) {
    const { foundStatus, headerError } = validateResponse(status, headers);
    let compression;
    const encoding = headers.get(headerEncoding);
    if (encoding !== null && encoding.toLowerCase() !== "identity") {
        compression = acceptCompression.find((c) => c.name === encoding);
        if (!compression) {
            throw new ConnectError(`unsupported response encoding "${encoding}"`, Code.Internal, headers);
        }
    }
    return {
        foundStatus,
        compression,
        headerError,
    };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __asyncValues = (undefined && undefined.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (undefined && undefined.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); };
var __asyncDelegator = (undefined && undefined.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (undefined && undefined.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
/**
 * Create a Transport for the gRPC protocol.
 */
function createTransport$1(opt) {
    return {
        async unary(method, signal, timeoutMs, header, message, contextValues) {
            const serialization = createMethodSerializationLookup(method, opt.binaryOptions, opt.jsonOptions, opt);
            timeoutMs =
                timeoutMs === undefined
                    ? opt.defaultTimeoutMs
                    : timeoutMs <= 0
                        ? undefined
                        : timeoutMs;
            return await runUnaryCall({
                interceptors: opt.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: false,
                    service: method.parent,
                    method,
                    requestMethod: "POST",
                    url: createMethodUrl(opt.baseUrl, method),
                    header: requestHeaderWithCompression(opt.useBinaryFormat, timeoutMs, header, opt.acceptCompression, opt.sendCompression),
                    contextValues: contextValues !== null && contextValues !== void 0 ? contextValues : createContextValues(),
                    message,
                },
                next: async (req) => {
                    const uRes = await opt.httpClient({
                        url: req.url,
                        method: "POST",
                        header: req.header,
                        signal: req.signal,
                        body: pipe(createAsyncIterable([req.message]), transformSerializeEnvelope(serialization.getI(opt.useBinaryFormat)), transformCompressEnvelope(opt.sendCompression, opt.compressMinBytes), transformJoinEnvelopes(), {
                            propagateDownStreamError: true,
                        }),
                    });
                    const { compression, headerError } = validateResponseWithCompression(opt.acceptCompression, uRes.status, uRes.header);
                    const message = await pipeTo(uRes.body, transformSplitEnvelope(opt.readMaxBytes), transformDecompressEnvelope(compression !== null && compression !== void 0 ? compression : null, opt.readMaxBytes), transformParseEnvelope(serialization.getO(opt.useBinaryFormat)), async (iterable) => {
                        var _a, e_1, _b, _c;
                        let message;
                        try {
                            for (var _d = true, iterable_1 = __asyncValues(iterable), iterable_1_1; iterable_1_1 = await iterable_1.next(), _a = iterable_1_1.done, !_a; _d = true) {
                                _c = iterable_1_1.value;
                                _d = false;
                                const chunk = _c;
                                if (message !== undefined) {
                                    throw new ConnectError("protocol error: received extra output message for unary method", Code.Unimplemented);
                                }
                                message = chunk;
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (!_d && !_a && (_b = iterable_1.return)) await _b.call(iterable_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return message;
                    }, { propagateDownStreamError: false });
                    validateTrailer(uRes.trailer, uRes.header);
                    if (message === undefined) {
                        // Trailers only response
                        if (headerError) {
                            throw headerError;
                        }
                        throw new ConnectError("protocol error: missing output message for unary method", uRes.trailer.has(headerGrpcStatus)
                            ? Code.Unimplemented
                            : Code.Unknown);
                    }
                    if (headerError) {
                        throw new ConnectError("protocol error: received output message for unary method with error status", Code.Unknown);
                    }
                    return {
                        stream: false,
                        service: method.parent,
                        method,
                        header: uRes.header,
                        message,
                        trailer: uRes.trailer,
                    };
                },
            });
        },
        async stream(method, signal, timeoutMs, header, input, contextValues) {
            const serialization = createMethodSerializationLookup(method, opt.binaryOptions, opt.jsonOptions, opt);
            timeoutMs =
                timeoutMs === undefined
                    ? opt.defaultTimeoutMs
                    : timeoutMs <= 0
                        ? undefined
                        : timeoutMs;
            return runStreamingCall({
                interceptors: opt.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: true,
                    service: method.parent,
                    method,
                    requestMethod: "POST",
                    url: createMethodUrl(opt.baseUrl, method),
                    header: requestHeaderWithCompression(opt.useBinaryFormat, timeoutMs, header, opt.acceptCompression, opt.sendCompression),
                    contextValues: contextValues !== null && contextValues !== void 0 ? contextValues : createContextValues(),
                    message: input,
                },
                next: async (req) => {
                    const uRes = await opt.httpClient({
                        url: req.url,
                        method: "POST",
                        header: req.header,
                        signal: req.signal,
                        body: pipe(req.message, transformSerializeEnvelope(serialization.getI(opt.useBinaryFormat)), transformCompressEnvelope(opt.sendCompression, opt.compressMinBytes), transformJoinEnvelopes(), { propagateDownStreamError: true }),
                    });
                    const { compression, foundStatus, headerError } = validateResponseWithCompression(opt.acceptCompression, uRes.status, uRes.header);
                    if (headerError) {
                        throw headerError;
                    }
                    const res = Object.assign(Object.assign({}, req), { header: uRes.header, trailer: uRes.trailer, message: pipe(uRes.body, transformSplitEnvelope(opt.readMaxBytes), transformDecompressEnvelope(compression !== null && compression !== void 0 ? compression : null, opt.readMaxBytes), transformParseEnvelope(serialization.getO(opt.useBinaryFormat)), function (iterable) {
                            return __asyncGenerator(this, arguments, function* () {
                                yield __await(yield* __asyncDelegator(__asyncValues(iterable)));
                                if (!foundStatus) {
                                    validateTrailer(uRes.trailer, uRes.header);
                                }
                            });
                        }, { propagateDownStreamError: true }) });
                    return res;
                },
            });
        },
    };
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Similar to ConnectError.from(), this function turns any value into
 * a ConnectError, but special cases some Node.js specific error codes and
 * sets an appropriate Connect error code.
 */
function connectErrorFromNodeReason(reason) {
    let code = Code.Internal;
    const chain = unwrapNodeErrorChain(reason).map(getNodeErrorProps);
    if (chain.some((p) => p.code == "ERR_STREAM_WRITE_AFTER_END")) {
        // We do not want intentional errors from the server to be shadowed
        // by client-side errors.
        // This can occur if the server has written a response with an error
        // and has ended the connection. This response may already sit in a
        // buffer on the client, while it is still writing to the request
        // body.
        // To avoid this problem, we wrap ERR_STREAM_WRITE_AFTER_END as a
        // ConnectError with Code.Aborted. The special meaning of this code
        // in this situation is documented in StreamingConn.send() and in
        // createServerStreamingFn().
        code = Code.Aborted;
    }
    else if (chain.some((p) => p.code == "ERR_STREAM_DESTROYED" ||
        p.code == "ERR_HTTP2_INVALID_STREAM" ||
        p.code == "ECONNRESET")) {
        // A handler whose stream is suddenly destroyed usually means the client
        // hung up. This behavior is triggered by the conformance test "cancel_after_begin".
        code = Code.Aborted;
    }
    else if (chain.some((p) => p.code == "ETIMEDOUT" ||
        p.code == "ENOTFOUND" ||
        p.code == "EAI_AGAIN" ||
        p.code == "ECONNREFUSED")) {
        // Calling an unresolvable host should raise a ConnectError with
        // Code.Aborted.
        // This behavior is covered by the conformance test "unresolvable_host".
        code = Code.Unavailable;
    }
    const ce = ConnectError.from(reason, code);
    if (ce !== reason) {
        ce.cause = reason;
    }
    return ce;
}
/**
 * Unwraps a chain of errors, by walking through all "cause" properties
 * recursively.
 * This function is useful to find the root cause of an error.
 */
function unwrapNodeErrorChain(reason) {
    const chain = [];
    for (;;) {
        if (!(reason instanceof Error)) {
            break;
        }
        if (chain.includes(reason)) {
            // safeguard against infinite loop when "cause" points to an ancestor
            break;
        }
        chain.push(reason);
        if (!("cause" in reason)) {
            break;
        }
        reason = reason.cause;
    }
    return chain;
}
/**
 * Returns standard Node.js error properties from the given reason, if present.
 *
 * For context: Every error raised by Node.js APIs should expose a `code`
 * property - a string that permanently identifies the error. Some errors may
 * have an additional `syscall` property - a string that identifies native
 * components, for example "getaddrinfo" of libuv.
 * For more information, see https://github.com/nodejs/node/blob/f6052c68c1f9a4400a723e9c0b79da14197ab754/lib/internal/errors.js
 */
function getNodeErrorProps(reason) {
    const props = {};
    if (reason instanceof Error) {
        if ("code" in reason && typeof reason.code == "string") {
            props.code = reason.code;
        }
        if ("syscall" in reason && typeof reason.syscall == "string") {
            props.syscall = reason.syscall;
        }
    }
    return props;
}
/**
 * Returns a ConnectError for an HTTP/2 error code.
 */
function connectErrorFromH2ResetCode(rstCode) {
    switch (rstCode) {
        case H2Code.PROTOCOL_ERROR:
        case H2Code.INTERNAL_ERROR:
        case H2Code.FLOW_CONTROL_ERROR:
        case H2Code.SETTINGS_TIMEOUT:
        case H2Code.FRAME_SIZE_ERROR:
        case H2Code.COMPRESSION_ERROR:
        case H2Code.CONNECT_ERROR:
            return new ConnectError(`http/2 stream closed with error code ${H2Code[rstCode]} (0x${rstCode.toString(16)})`, Code.Internal);
        case H2Code.REFUSED_STREAM:
            return new ConnectError(`http/2 stream closed with error code ${H2Code[rstCode]} (0x${rstCode.toString(16)})`, Code.Unavailable);
        case H2Code.CANCEL:
            return new ConnectError(`http/2 stream closed with error code ${H2Code[rstCode]} (0x${rstCode.toString(16)})`, Code.Canceled);
        case H2Code.ENHANCE_YOUR_CALM:
            return new ConnectError(`http/2 stream closed with error code ${H2Code[rstCode]} (0x${rstCode.toString(16)})`, Code.ResourceExhausted);
        case H2Code.INADEQUATE_SECURITY:
            return new ConnectError(`http/2 stream closed with error code ${H2Code[rstCode]} (0x${rstCode.toString(16)})`, Code.PermissionDenied);
        case H2Code.HTTP_1_1_REQUIRED:
            return new ConnectError(`http/2 stream closed with error code ${H2Code[rstCode]} (0x${rstCode.toString(16)})`, Code.PermissionDenied);
        case H2Code.STREAM_CLOSED:
    }
    return undefined;
}
var H2Code;
(function (H2Code) {
    H2Code[H2Code["PROTOCOL_ERROR"] = 1] = "PROTOCOL_ERROR";
    H2Code[H2Code["INTERNAL_ERROR"] = 2] = "INTERNAL_ERROR";
    H2Code[H2Code["FLOW_CONTROL_ERROR"] = 3] = "FLOW_CONTROL_ERROR";
    H2Code[H2Code["SETTINGS_TIMEOUT"] = 4] = "SETTINGS_TIMEOUT";
    H2Code[H2Code["STREAM_CLOSED"] = 5] = "STREAM_CLOSED";
    H2Code[H2Code["FRAME_SIZE_ERROR"] = 6] = "FRAME_SIZE_ERROR";
    H2Code[H2Code["REFUSED_STREAM"] = 7] = "REFUSED_STREAM";
    H2Code[H2Code["CANCEL"] = 8] = "CANCEL";
    H2Code[H2Code["COMPRESSION_ERROR"] = 9] = "COMPRESSION_ERROR";
    H2Code[H2Code["CONNECT_ERROR"] = 10] = "CONNECT_ERROR";
    H2Code[H2Code["ENHANCE_YOUR_CALM"] = 11] = "ENHANCE_YOUR_CALM";
    H2Code[H2Code["INADEQUATE_SECURITY"] = 12] = "INADEQUATE_SECURITY";
    H2Code[H2Code["HTTP_1_1_REQUIRED"] = 13] = "HTTP_1_1_REQUIRED";
})(H2Code || (H2Code = {}));

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const gzip = util.promisify(zlib__namespace.gzip);
const gunzip = util.promisify(zlib__namespace.gunzip);
const brotliCompress = util.promisify(zlib__namespace.brotliCompress);
const brotliDecompress = util.promisify(zlib__namespace.brotliDecompress);
/**
 * The gzip compression algorithm, implemented with the Node.js built-in module
 * zlib. This value can be used for the `sendCompression` and `acceptCompression`
 * option of client transports, or for the `acceptCompression` option of server
 * plugins like `fastifyConnectPlugin` from @connectrpc/connect-fastify.
 */
const compressionGzip = {
    name: "gzip",
    compress(bytes) {
        return gzip(bytes, {});
    },
    decompress(bytes, readMaxBytes) {
        if (bytes.length == 0) {
            return Promise.resolve(new Uint8Array(0));
        }
        return wrapZLibErrors(gunzip(bytes, {
            maxOutputLength: readMaxBytes,
        }), readMaxBytes);
    },
};
/**
 * The brotli compression algorithm, implemented with the Node.js built-in module
 * zlib. This value can be used for the `sendCompression` and `acceptCompression`
 * option of client transports, or for the `acceptCompression` option of server
 * plugins like `fastifyConnectPlugin` from @connectrpc/connect-fastify.
 */
const compressionBrotli = {
    name: "br",
    compress(bytes) {
        return brotliCompress(bytes, {});
    },
    decompress(bytes, readMaxBytes) {
        if (bytes.length == 0) {
            return Promise.resolve(new Uint8Array(0));
        }
        return wrapZLibErrors(brotliDecompress(bytes, {
            maxOutputLength: readMaxBytes,
        }), readMaxBytes);
    },
};
function wrapZLibErrors(promise, readMaxBytes) {
    return promise.catch((e) => {
        const props = getNodeErrorProps(e);
        let code = Code.Internal;
        let message = "decompression failed";
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (props.code) {
            case "ERR_BUFFER_TOO_LARGE":
                code = Code.ResourceExhausted;
                message = `message is larger than configured readMaxBytes ${readMaxBytes} after decompression`;
                break;
            case "Z_DATA_ERROR":
            case "ERR_PADDING_2":
                code = Code.InvalidArgument;
                break;
            default:
                if (props.code !== undefined &&
                    props.code.startsWith("ERR__ERROR_FORMAT_")) {
                    code = Code.InvalidArgument;
                }
                break;
        }
        return Promise.reject(new ConnectError(message, code, undefined, undefined, e));
    });
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Convert a Node.js header object to a fetch API Headers object.
 *
 * This function works for Node.js incoming and outgoing headers, and for the
 * http and the http2 package.
 *
 * HTTP/2 pseudo-headers (:method, :path, etc.) are stripped.
 */
function nodeHeaderToWebHeader(nodeHeaders) {
    const header = new Headers();
    for (const [k, v] of Object.entries(nodeHeaders)) {
        if (k.startsWith(":")) {
            continue;
        }
        if (v === undefined) {
            continue;
        }
        if (typeof v == "string") {
            header.append(k, v);
        }
        else if (typeof v == "number") {
            header.append(k, String(v));
        }
        else {
            for (const e of v) {
                header.append(k, e);
            }
        }
    }
    return header;
}
function webHeaderToNodeHeaders(headersInit, defaultNodeHeaders) {
    if (headersInit === undefined && defaultNodeHeaders === undefined) {
        return undefined;
    }
    const o = Object.create(null);
    if (defaultNodeHeaders !== undefined) {
        for (const [key, value] of Object.entries(defaultNodeHeaders)) {
            if (Array.isArray(value)) {
                o[key] = value.concat();
            }
            else if (value !== undefined) {
                o[key] = value;
            }
        }
    }
    if (headersInit !== undefined) {
        if (Array.isArray(headersInit)) {
            for (const [key, value] of headersInit) {
                appendWebHeader(o, key, value);
            }
        }
        else if ("forEach" in headersInit) {
            if (typeof headersInit.forEach == "function") {
                headersInit.forEach((value, key) => {
                    appendWebHeader(o, key, value);
                });
            }
        }
        else {
            for (const [key, value] of Object.entries(headersInit)) {
                appendWebHeader(o, key, value);
            }
        }
    }
    return o;
}
function appendWebHeader(o, key, value) {
    key = key.toLowerCase();
    const existing = o[key];
    if (Array.isArray(existing)) {
        existing.push(value);
    }
    else if (existing === undefined) {
        o[key] = value;
    }
    else {
        o[key] = [existing.toString(), value];
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Manage an HTTP/2 connection and keep it alive with PING frames.
 *
 * The logic is based on "Basic Keepalive" described in
 * https://github.com/grpc/proposal/blob/0ba0c1905050525f9b0aee46f3f23c8e1e515489/A8-client-side-keepalive.md#basic-keepalive
 * as well as the client channel arguments described in
 * https://github.com/grpc/grpc/blob/8e137e524a1b1da7bbf4603662876d5719563b57/doc/keepalive.md
 *
 * Usually, the managers tracks exactly one connection, but if a connection
 * receives a GOAWAY frame with NO_ERROR, the connection is maintained until
 * all streams have finished, and new requests will open a new connection.
 */
class Http2SessionManager {
    /**
     * The current state of the connection:
     *
     * - "closed"
     *   The connection is closed, or no connection has been opened yet.
     * - connecting
     *   Currently establishing a connection.
     *
     * - "open"
     *   A connection is open and has open streams. PING frames are sent every
     *   pingIntervalMs, unless a stream received data.
     *   If a PING frame is not responded to within pingTimeoutMs, the connection
     *   and all open streams close.
     *
     * - "idle"
     *   A connection is open, but it does not have any open streams.
     *   If pingIdleConnection is enabled, PING frames are used to keep the
     *   connection alive, similar to an "open" connection.
     *   If a connection is idle for longer than idleConnectionTimeoutMs, it closes.
     *   If a request is made on an idle connection that has not been used for
     *   longer than pingIntervalMs, the connection is verified.
     *
     * - "verifying"
     *   Verifying a connection after a long period of inactivity before issuing a
     *   request. A PING frame is sent, and if it times out within pingTimeoutMs, a
     *   new connection is opened.
     *
     * - "error"
     *   The connection is closed because of a transient error. A connection
     *   may have failed to reach the host, or the connection may have died,
     *   or it may have been aborted.
     */
    state() {
        if (this.s.t == "ready") {
            if (this.verifying !== undefined) {
                return "verifying";
            }
            return this.s.streamCount() > 0 ? "open" : "idle";
        }
        return this.s.t;
    }
    /**
     * Returns the error object if the connection is in the "error" state,
     * `undefined` otherwise.
     */
    error() {
        if (this.s.t == "error") {
            return this.s.reason;
        }
        return undefined;
    }
    constructor(url, pingOptions, http2SessionOptions) {
        var _a, _b, _c, _d;
        this.s = closed();
        this.shuttingDown = [];
        this.authority = new URL(url).origin;
        this.http2SessionOptions = http2SessionOptions;
        this.options = {
            pingIntervalMs: (_a = pingOptions === null || pingOptions === void 0 ? void 0 : pingOptions.pingIntervalMs) !== null && _a !== void 0 ? _a : Number.POSITIVE_INFINITY,
            pingTimeoutMs: (_b = pingOptions === null || pingOptions === void 0 ? void 0 : pingOptions.pingTimeoutMs) !== null && _b !== void 0 ? _b : 1000 * 15,
            pingIdleConnection: (_c = pingOptions === null || pingOptions === void 0 ? void 0 : pingOptions.pingIdleConnection) !== null && _c !== void 0 ? _c : false,
            idleConnectionTimeoutMs: (_d = pingOptions === null || pingOptions === void 0 ? void 0 : pingOptions.idleConnectionTimeoutMs) !== null && _d !== void 0 ? _d : 1000 * 60 * 15,
        };
    }
    /**
     * Open a connection if none exists, verify an existing connection if
     * necessary.
     */
    async connect() {
        try {
            const ready = await this.gotoReady();
            return ready.streamCount() > 0 ? "open" : "idle";
        }
        catch (e) {
            return "error";
        }
    }
    /**
     * Issue a request.
     *
     * This method automatically opens a connection if none exists, and verifies
     * an existing connection if necessary. It calls http2.ClientHttp2Session.request(),
     * and keeps track of all open http2.ClientHttp2Stream.
     *
     * Clients must call notifyResponseByteRead() whenever they successfully read
     * data from the http2.ClientHttp2Stream.
     */
    async request(method, path, headers, options) {
        // Request sometimes fails with goaway/destroyed
        // errors, we use a loop to retry.
        //
        // This is not expected to happen often, but it is possible that a
        // connection is closed while we are trying to open a stream.
        //
        // Ref: https://github.com/nodejs/help/issues/2105
        for (;;) {
            const ready = await this.gotoReady();
            try {
                const stream = ready.conn.request(Object.assign(Object.assign({}, headers), { ":method": method, ":path": path }), options);
                ready.registerRequest(stream);
                return stream;
            }
            catch (e) {
                // Check to see if the connection is closed or destroyed
                // and if so, we try again.
                if (ready.conn.closed || ready.conn.destroyed) {
                    continue;
                }
                throw e;
            }
        }
    }
    /**
     * Notify the manager of a successful read from a http2.ClientHttp2Stream.
     *
     * Clients must call this function whenever they successfully read data from
     * a http2.ClientHttp2Stream obtained from request(). This informs the
     * keep-alive logic that the connection is alive, and prevents it from sending
     * unnecessary PING frames.
     */
    notifyResponseByteRead(stream) {
        if (this.s.t == "ready") {
            this.s.responseByteRead(stream);
        }
        for (const s of this.shuttingDown) {
            s.responseByteRead(stream);
        }
    }
    /**
     * If there is an open connection, close it. This also closes any open streams.
     */
    abort(reason) {
        var _a, _b, _c;
        const err = reason !== null && reason !== void 0 ? reason : new ConnectError("connection aborted", Code.Canceled);
        (_b = (_a = this.s).abort) === null || _b === void 0 ? void 0 : _b.call(_a, err);
        for (const s of this.shuttingDown) {
            (_c = s.abort) === null || _c === void 0 ? void 0 : _c.call(s, err);
        }
        this.setState(closedOrError(err));
    }
    async gotoReady() {
        if (this.s.t == "ready") {
            if (this.s.isShuttingDown() ||
                this.s.conn.closed ||
                this.s.conn.destroyed) {
                this.setState(connect(this.authority, this.http2SessionOptions));
            }
            else if (this.s.requiresVerify()) {
                await this.verify(this.s);
            }
        }
        else if (this.s.t == "closed" || this.s.t == "error") {
            this.setState(connect(this.authority, this.http2SessionOptions));
        }
        while (this.s.t !== "ready") {
            if (this.s.t === "error") {
                throw this.s.reason;
            }
            if (this.s.t === "connecting") {
                await this.s.conn;
            }
        }
        return this.s;
    }
    setState(state) {
        var _a, _b;
        (_b = (_a = this.s).onExitState) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (this.s.t == "ready" && this.s.isShuttingDown()) {
            // Maintain connections that have been asked to shut down.
            const sd = this.s;
            this.shuttingDown.push(sd);
            sd.onClose = sd.onError = () => {
                const i = this.shuttingDown.indexOf(sd);
                if (i !== -1) {
                    this.shuttingDown.splice(i, 1);
                }
            };
        }
        switch (state.t) {
            case "connecting":
                state.conn.then((value) => {
                    this.setState(ready(value, this.options));
                }, (reason) => {
                    this.setState(closedOrError(reason));
                });
                break;
            case "ready":
                state.onClose = () => this.setState(closed());
                state.onError = (err) => this.setState(closedOrError(err));
                break;
        }
        this.s = state;
    }
    verify(stateReady) {
        if (this.verifying !== undefined) {
            return this.verifying;
        }
        this.verifying = stateReady
            .verify()
            .then((success) => {
            if (success) {
                return;
            }
            // verify() has destroyed the old connection
            this.setState(connect(this.authority, this.http2SessionOptions));
        }, (reason) => {
            this.setState(closedOrError(reason));
        })
            .finally(() => {
            this.verifying = undefined;
        });
        return this.verifying;
    }
}
function closed() {
    return {
        t: "closed",
    };
}
function error(reason) {
    return {
        t: "error",
        reason,
    };
}
function closedOrError(reason) {
    const isCancel = reason instanceof ConnectError &&
        ConnectError.from(reason).code == Code.Canceled;
    return isCancel ? closed() : error(reason);
}
function connect(authority, http2SessionOptions) {
    let resolve;
    let reject;
    const conn = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    const newConn = http2__namespace.connect(authority, http2SessionOptions);
    newConn.on("connect", onConnect);
    newConn.on("error", onError);
    function onConnect() {
        resolve === null || resolve === void 0 ? void 0 : resolve(newConn);
        cleanup();
    }
    function onError(err) {
        reject === null || reject === void 0 ? void 0 : reject(connectErrorFromNodeReason(err));
        cleanup();
    }
    function cleanup() {
        newConn.off("connect", onConnect);
        newConn.off("error", onError);
    }
    return {
        t: "connecting",
        conn,
        abort(reason) {
            if (!newConn.destroyed) {
                newConn.destroy(undefined, http2__namespace.constants.NGHTTP2_CANCEL);
            }
            // According to the documentation, destroy() should immediately terminate
            // the session and the socket, but we still receive a "connect" event.
            // We must not resolve a broken connection, so we reject it manually here.
            reject === null || reject === void 0 ? void 0 : reject(reason);
        },
        onExitState() {
            cleanup();
        },
    };
}
function ready(conn, options) {
    // Users have reported an error "The session has been destroyed" raised
    // from H2SessionManager.request(), see https://github.com/connectrpc/connect-es/issues/683
    // This assertion will show whether the session already died in the
    // "connecting" state.
    assertSessionOpen(conn);
    // Do not block Node.js from exiting on an idle connection.
    // Note that we ref() again for the first stream to open, and unref() again
    // for the last stream to close.
    conn.unref();
    // the last time we were sure that the connection is alive, via a PING
    // response, or via received response bytes
    let lastAliveAt = Date.now();
    // how many streams are currently open on this session
    let streamCount = 0;
    // timer for the keep-alive interval
    let pingIntervalId;
    // timer for waiting for a PING response
    let pingTimeoutId;
    // keep track of GOAWAY - gracefully shut down open streams / wait for connection to error
    let receivedGoAway = false;
    // keep track of GOAWAY with ENHANCE_YOUR_CALM and with debug data too_many_pings
    let receivedGoAwayEnhanceYourCalmTooManyPings = false;
    // timer for closing connections without open streams, must be initialized
    let idleTimeoutId;
    resetIdleTimeout();
    const state = {
        t: "ready",
        conn,
        streamCount() {
            return streamCount;
        },
        requiresVerify() {
            const elapsedMs = Date.now() - lastAliveAt;
            return elapsedMs > options.pingIntervalMs;
        },
        isShuttingDown() {
            return receivedGoAway;
        },
        onClose: undefined,
        onError: undefined,
        registerRequest(stream) {
            streamCount++;
            if (streamCount == 1) {
                conn.ref();
                resetPingInterval(); // reset to ping with the appropriate interval for "open"
                stopIdleTimeout();
            }
            stream.once("response", () => {
                lastAliveAt = Date.now();
                resetPingInterval();
            });
            stream.once("close", () => {
                streamCount--;
                if (streamCount == 0) {
                    conn.unref();
                    resetPingInterval(); // reset to ping with the appropriate interval for "idle"
                    resetIdleTimeout();
                }
            });
        },
        responseByteRead(stream) {
            if (stream.session !== conn) {
                return;
            }
            if (conn.closed || conn.destroyed) {
                return;
            }
            if (streamCount <= 0) {
                return;
            }
            lastAliveAt = Date.now();
            resetPingInterval();
        },
        verify() {
            conn.ref();
            return new Promise((resolve) => {
                commonPing(() => {
                    if (streamCount == 0)
                        conn.unref();
                    resolve(true);
                });
                conn.once("error", () => resolve(false));
            });
        },
        abort(reason) {
            if (!conn.destroyed) {
                conn.once("error", () => {
                    // conn.destroy() may raise an error after onExitState() was called
                    // and our error listeners are removed.
                    // We attach this one to swallow uncaught exceptions.
                });
                conn.destroy(reason, http2__namespace.constants.NGHTTP2_CANCEL);
            }
        },
        onExitState() {
            if (state.isShuttingDown()) {
                // Per the interface, this method is called when the manager is leaving
                // the state. We maintain this connection in the session manager until
                // all streams have finished, so we do not detach event listeners here.
                return;
            }
            cleanup();
            this.onError = undefined;
            this.onClose = undefined;
        },
    };
    // start or restart the ping interval
    function resetPingInterval() {
        stopPingInterval();
        if (streamCount > 0 || options.pingIdleConnection) {
            pingIntervalId = safeSetTimeout(onPingInterval, options.pingIntervalMs);
        }
    }
    function stopPingInterval() {
        clearTimeout(pingIntervalId);
        clearTimeout(pingTimeoutId);
    }
    function onPingInterval() {
        commonPing(resetPingInterval);
    }
    function commonPing(onSuccess) {
        clearTimeout(pingTimeoutId);
        pingTimeoutId = safeSetTimeout(() => {
            conn.destroy(new ConnectError("PING timed out", Code.Unavailable), http2__namespace.constants.NGHTTP2_CANCEL);
        }, options.pingTimeoutMs);
        conn.ping((err, duration) => {
            clearTimeout(pingTimeoutId);
            if (err !== null) {
                // We will receive an ERR_HTTP2_PING_CANCEL here if we destroy the
                // connection with a pending ping.
                // We might also see other errors, but they should be picked up by the
                // "error" event listener.
                return;
            }
            if (duration > options.pingTimeoutMs) {
                // setTimeout is not precise, and HTTP/2 pings take less than 1ms in
                // tests.
                conn.destroy(new ConnectError("PING timed out", Code.Unavailable), http2__namespace.constants.NGHTTP2_CANCEL);
                return;
            }
            lastAliveAt = Date.now();
            onSuccess();
        });
    }
    function stopIdleTimeout() {
        clearTimeout(idleTimeoutId);
    }
    function resetIdleTimeout() {
        idleTimeoutId = safeSetTimeout(onIdleTimeout, options.idleConnectionTimeoutMs);
    }
    function onIdleTimeout() {
        conn.close();
        onClose(); // trigger a state change right away, so we are not open to races
    }
    function onGoaway(errorCode, lastStreamID, opaqueData) {
        receivedGoAway = true;
        const tooManyPingsAscii = Buffer.from("too_many_pings", "ascii");
        if (errorCode === http2__namespace.constants.NGHTTP2_ENHANCE_YOUR_CALM &&
            opaqueData != null &&
            opaqueData.equals(tooManyPingsAscii)) {
            // double pingIntervalMs, following the last paragraph of https://github.com/grpc/proposal/blob/0ba0c1905050525f9b0aee46f3f23c8e1e515489/A8-client-side-keepalive.md#basic-keepalive
            options.pingIntervalMs = options.pingIntervalMs * 2;
            receivedGoAwayEnhanceYourCalmTooManyPings = true;
        }
        if (errorCode === http2__namespace.constants.NGHTTP2_NO_ERROR && streamCount == 0) {
            // Node.js v16 closes the connection on its own when it receives a GOAWAY
            // frame and there are no open streams (emitting a "close" event and
            // destroying the session), but later versions do not.
            // Calling close() ourselves is ineffective here - it appears that the
            // method is already being called, see https://github.com/nodejs/node/blob/198affc63973805ce5102d246f6b7822be57f5fc/lib/internal/http2/core.js#L681
            conn.destroy(new ConnectError("received GOAWAY without any open streams", Code.Canceled), http2__namespace.constants.NGHTTP2_NO_ERROR);
        }
    }
    function onClose() {
        var _a;
        cleanup();
        (_a = state.onClose) === null || _a === void 0 ? void 0 : _a.call(state);
    }
    function onError(err) {
        var _a, _b;
        cleanup();
        if (receivedGoAwayEnhanceYourCalmTooManyPings) {
            // We cannot prevent node from destroying session and streams with its own
            // error that does not carry debug data, but at least we can wrap the error
            // we surface on the manager.
            const ce = new ConnectError(`http/2 connection closed with error code ENHANCE_YOUR_CALM (0x${http2__namespace.constants.NGHTTP2_ENHANCE_YOUR_CALM.toString(16)}), too_many_pings, doubled the interval`, Code.ResourceExhausted);
            (_a = state.onError) === null || _a === void 0 ? void 0 : _a.call(state, ce);
        }
        else {
            (_b = state.onError) === null || _b === void 0 ? void 0 : _b.call(state, connectErrorFromNodeReason(err));
        }
    }
    function cleanup() {
        stopPingInterval();
        stopIdleTimeout();
        conn.off("error", onError);
        conn.off("close", onClose);
        conn.off("goaway", onGoaway);
    }
    conn.on("error", onError);
    conn.on("close", onClose);
    conn.on("goaway", onGoaway);
    return state;
}
/**
 * setTimeout(), but simply ignores values larger than the maximum supported
 * value (signed 32-bit integer) instead of calling the callback right away,
 * and does not block Node.js from exiting.
 */
function safeSetTimeout(callback, ms) {
    if (ms > 0x7fffffff) {
        return;
    }
    return setTimeout(callback, ms).unref();
}
function assertSessionOpen(conn) {
    if (conn.connecting) {
        throw new ConnectError("expected open session, but it is connecting", Code.Internal);
    }
    if (conn.destroyed) {
        throw new ConnectError("expected open session, but it is destroyed", Code.Internal);
    }
    if (conn.closed) {
        throw new ConnectError("expected open session, but it is closed", Code.Internal);
    }
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Create a universal client function, a minimal abstraction of an HTTP client,
 * using the Node.js `http`, `https`, or `http2` module.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function createNodeHttpClient(options) {
    var _a;
    if (options.httpVersion == "1.1") {
        return createNodeHttp1Client(options.nodeOptions);
    }
    const sessionProvider = (_a = options.sessionProvider) !== null && _a !== void 0 ? _a : ((url) => new Http2SessionManager(url));
    return createNodeHttp2Client(sessionProvider);
}
/**
 * Create an HTTP client using the Node.js `http` or `https` package.
 *
 * The HTTP client is a simple function conforming to the type UniversalClientFn.
 * It takes an UniversalClientRequest as an argument, and returns a promise for
 * an UniversalClientResponse.
 */
function createNodeHttp1Client(httpOptions) {
    return async function request(req) {
        const sentinel = createSentinel(req.signal);
        return new Promise((resolve, reject) => {
            sentinel.catch((e) => {
                reject(e);
            });
            h1Request(sentinel, req.url, Object.assign(Object.assign({}, httpOptions), { headers: webHeaderToNodeHeaders(req.header, httpOptions === null || httpOptions === void 0 ? void 0 : httpOptions.headers), method: req.method }), (request) => {
                void sinkRequest(req, request, sentinel);
                request.on("response", (response) => {
                    var _a;
                    response.on("error", sentinel.reject);
                    sentinel.catch((reason) => response.destroy(connectErrorFromNodeReason(reason)));
                    const trailer = new Headers();
                    resolve({
                        status: (_a = response.statusCode) !== null && _a !== void 0 ? _a : 0,
                        header: nodeHeaderToWebHeader(response.headers),
                        body: h1ResponseIterable(sentinel, response, trailer),
                        trailer,
                    });
                });
            });
        });
    };
}
/**
 * Create an HTTP client using the Node.js `http2` package.
 *
 * The HTTP client is a simple function conforming to the type UniversalClientFn.
 * It takes an UniversalClientRequest as an argument, and returns a promise for
 * an UniversalClientResponse.
 */
function createNodeHttp2Client(sessionProvider) {
    return function request(req) {
        const sentinel = createSentinel(req.signal);
        const sessionManager = sessionProvider(req.url);
        return new Promise((resolve, reject) => {
            sentinel.catch((e) => {
                reject(e);
            });
            h2Request(sentinel, sessionManager, req.url, req.method, webHeaderToNodeHeaders(req.header), {}, (stream) => {
                void sinkRequest(req, stream, sentinel);
                stream.on("response", (headers) => {
                    var _a;
                    const response = {
                        status: (_a = headers[":status"]) !== null && _a !== void 0 ? _a : 0,
                        header: nodeHeaderToWebHeader(headers),
                        body: h2ResponseIterable(sentinel, stream, sessionManager),
                        trailer: h2ResponseTrailer(stream),
                    };
                    resolve(response);
                });
            });
        });
    };
}
function h1Request(sentinel, url, options, onRequest) {
    let request;
    if (new URL(url).protocol.startsWith("https")) {
        request = https__namespace.request(url, options);
    }
    else {
        request = http__namespace.request(url, options);
    }
    sentinel.catch((reason) => request.destroy(connectErrorFromNodeReason(reason)));
    // Node.js will only send headers with the first request body byte by default.
    // We force it to send headers right away for consistent behavior between
    // HTTP/1.1 and HTTP/2.2 clients.
    request.flushHeaders();
    request.on("error", sentinel.reject);
    request.on("socket", function onRequestSocket(socket) {
        function onSocketConnect() {
            socket.off("connect", onSocketConnect);
            onRequest(request);
        }
        // If readyState is open, then socket is already open due to keepAlive, so
        // the 'connect' event will never fire so call onRequest explicitly
        if (socket.readyState === "open") {
            onRequest(request);
        }
        else {
            socket.on("connect", onSocketConnect);
        }
    });
}
function h1ResponseIterable(sentinel, response, trailer) {
    const inner = response[Symbol.asyncIterator]();
    return {
        [Symbol.asyncIterator]() {
            return {
                async next() {
                    const r = await sentinel.race(inner.next());
                    if (r.done === true) {
                        nodeHeaderToWebHeader(response.trailers).forEach((value, key) => {
                            trailer.set(key, value);
                        });
                        sentinel.resolve();
                        await sentinel;
                    }
                    return r;
                },
                throw(e) {
                    sentinel.reject(e);
                    throw e;
                },
            };
        },
    };
}
function h2Request(sentinel, sm, url, method, headers, options, onStream) {
    const requestUrl = new URL(url);
    if (requestUrl.origin !== sm.authority) {
        const message = `cannot make a request to ${requestUrl.origin}: the http2 session is connected to ${sm.authority}`;
        sentinel.reject(new ConnectError(message, Code.Internal));
        return;
    }
    sm.request(method, requestUrl.pathname + requestUrl.search, headers, {}).then((stream) => {
        sentinel.catch((reason) => {
            if (stream.closed) {
                return;
            }
            // Node.js http2 streams that are aborted via an AbortSignal close with
            // an RST_STREAM with code INTERNAL_ERROR.
            // To comply with the mapping between gRPC and HTTP/2 codes, we need to
            // close with code CANCEL.
            // See https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md#errors
            // See https://www.rfc-editor.org/rfc/rfc7540#section-7
            const rstCode = reason instanceof ConnectError && reason.code == Code.Canceled
                ? H2Code.CANCEL
                : H2Code.INTERNAL_ERROR;
            return new Promise((resolve) => stream.close(rstCode, resolve));
        });
        stream.on("error", function h2StreamError(e) {
            if (stream.writableEnded &&
                unwrapNodeErrorChain(e)
                    .map(getNodeErrorProps)
                    .some((p) => p.code == "ERR_STREAM_WRITE_AFTER_END")) {
                return;
            }
            sentinel.reject(e);
        });
        stream.on("close", function h2StreamClose() {
            const err = connectErrorFromH2ResetCode(stream.rstCode);
            if (err) {
                sentinel.reject(err);
            }
        });
        onStream(stream);
    }, (reason) => {
        sentinel.reject(reason);
    });
}
function h2ResponseTrailer(response) {
    const trailer = new Headers();
    response.on("trailers", (args) => {
        nodeHeaderToWebHeader(args).forEach((value, key) => {
            trailer.set(key, value);
        });
    });
    return trailer;
}
function h2ResponseIterable(sentinel, response, sm) {
    const inner = response[Symbol.asyncIterator]();
    return {
        [Symbol.asyncIterator]() {
            return {
                async next() {
                    const r = await sentinel.race(inner.next());
                    if (r.done === true) {
                        sentinel.resolve();
                        await sentinel;
                    }
                    sm === null || sm === void 0 ? void 0 : sm.notifyResponseByteRead(response);
                    return r;
                },
                throw(e) {
                    sentinel.reject(e);
                    throw e;
                },
            };
        },
    };
}
async function sinkRequest(request, nodeRequest, sentinel) {
    if (request.body === undefined) {
        await new Promise((resolve) => nodeRequest.end(resolve));
        return;
    }
    const it = request.body[Symbol.asyncIterator]();
    return new Promise((resolve) => {
        writeNext();
        function writeNext() {
            if (sentinel.isRejected()) {
                return;
            }
            it.next().then((r) => {
                if (r.done === true) {
                    nodeRequest.end(resolve);
                    return;
                }
                nodeRequest.write(r.value, "binary", function (e) {
                    if (e === null || e === undefined) {
                        writeNext();
                        return;
                    }
                    if (it.throw !== undefined) {
                        it.throw(connectErrorFromNodeReason(e)).catch(() => {
                            //
                        });
                    }
                    // If the server responds and closes the connection before the client has written the entire response
                    // body, we get an ERR_STREAM_WRITE_AFTER_END error code from Node.js here.
                    // We do want to notify the iterable of the error condition, but we do not want to reject our sentinel,
                    // because that would also affect the reading side.
                    if (nodeRequest.writableEnded &&
                        unwrapNodeErrorChain(e)
                            .map(getNodeErrorProps)
                            .some((p) => p.code == "ERR_STREAM_WRITE_AFTER_END")) {
                        return;
                    }
                    sentinel.reject(e);
                });
            }, (e) => {
                sentinel.reject(e);
            });
        }
    });
}
function createSentinel(signal) {
    let res;
    let rej;
    let resolved = false;
    let rejected = false;
    const p = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
    });
    const c = {
        resolve() {
            if (!resolved && !rejected) {
                resolved = true;
                res === null || res === void 0 ? void 0 : res();
            }
        },
        isResolved() {
            return resolved;
        },
        reject(reason) {
            if (!resolved && !rejected) {
                rejected = true;
                rej === null || rej === void 0 ? void 0 : rej(connectErrorFromNodeReason(reason));
            }
        },
        isRejected() {
            return rejected;
        },
        async race(promise) {
            const r = await Promise.race([promise, p]);
            if (r === undefined && resolved) {
                throw new ConnectError("sentinel completed early", Code.Internal);
            }
            return r;
        },
    };
    const s = Object.assign(p, c);
    function onSignalAbort() {
        c.reject(getAbortSignalReason(this));
    }
    if (signal) {
        if (signal.aborted) {
            c.reject(getAbortSignalReason(signal));
        }
        else {
            signal.addEventListener("abort", onSignalAbort);
        }
        p.finally(() => signal.removeEventListener("abort", onSignalAbort)).catch(() => {
            // We intentionally swallow sentinel rejection - errors must
            // propagate through the request or response iterables.
        });
    }
    return s;
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Asserts that the options are within sane limits, and returns default values
 * where no value is provided.
 *
 * @private Internal code, does not follow semantic versioning.
 */
function validateNodeTransportOptions(options) {
    var _a, _b, _c, _d;
    let httpClient;
    if (options.httpVersion == "2") {
        let sessionManager;
        if (options.sessionManager) {
            sessionManager = options.sessionManager;
        }
        else {
            sessionManager = new Http2SessionManager(options.baseUrl, {
                pingIntervalMs: options.pingIntervalMs,
                pingIdleConnection: options.pingIdleConnection,
                pingTimeoutMs: options.pingTimeoutMs,
                idleConnectionTimeoutMs: options.idleConnectionTimeoutMs,
            }, options.nodeOptions);
        }
        httpClient = createNodeHttpClient({
            httpVersion: "2",
            sessionProvider: () => sessionManager,
        });
    }
    else {
        httpClient = createNodeHttpClient({
            httpVersion: "1.1",
            nodeOptions: options.nodeOptions,
        });
    }
    return Object.assign(Object.assign(Object.assign({}, options), { httpClient, useBinaryFormat: (_a = options.useBinaryFormat) !== null && _a !== void 0 ? _a : true, interceptors: (_b = options.interceptors) !== null && _b !== void 0 ? _b : [], sendCompression: (_c = options.sendCompression) !== null && _c !== void 0 ? _c : null, acceptCompression: (_d = options.acceptCompression) !== null && _d !== void 0 ? _d : [
            compressionGzip,
            compressionBrotli,
        ] }), validateReadWriteMaxBytes(options.readMaxBytes, options.writeMaxBytes, options.compressMinBytes));
}

// Copyright 2021-2025 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * Create a Transport for the gRPC protocol using the Node.js `http2` module.
 */
function createGrpcTransport(options) {
    return createTransport$1(validateNodeTransportOptions(Object.assign(Object.assign({}, options), { httpVersion: "2" })));
}

const createAuthInterceptor = (token) => {
    return (next) => async (req) => {
        req.header.set("Authorization", `Bearer ${token}`);
        return next(req);
    };
};

const createTransport = (baseUrl, token) => {
    const interceptors = [];
    if (token) {
        interceptors.push(createAuthInterceptor(token));
    }
    return createGrpcTransport({
        baseUrl: baseUrl,
        interceptors: interceptors,
        useBinaryFormat: true,
    });
};

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/storage/v1/common/kyc_item.proto (package brij.storage.v1.common, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/storage/v1/common/kyc_item.proto.
 */
const file_brij_storage_v1_common_kyc_item = /*@__PURE__*/
  fileDesc("CiVicmlqL3N0b3JhZ2UvdjEvY29tbW9uL2t5Y19pdGVtLnByb3RvEhZicmlqLnN0b3JhZ2UudjEuY29tbW9uIo8CCgdLeWNJdGVtEhEKCWNvdW50cmllcxgBIAMoCRIxCgZzdGF0dXMYAiABKA4yIS5icmlqLnN0b3JhZ2UudjEuY29tbW9uLkt5Y1N0YXR1cxIQCghwcm92aWRlchgDIAEoCRIXCg91c2VyX3B1YmxpY19rZXkYBCABKAkSDgoGaGFzaGVzGAUgAygJEkwKD2FkZGl0aW9uYWxfZGF0YRgGIAMoCzIzLmJyaWouc3RvcmFnZS52MS5jb21tb24uS3ljSXRlbS5BZGRpdGlvbmFsRGF0YUVudHJ5GjUKE0FkZGl0aW9uYWxEYXRhRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgMOgI4ASpxCglLeWNTdGF0dXMSGgoWS1lDX1NUQVRVU19VTlNQRUNJRklFRBAAEhYKEktZQ19TVEFUVVNfUEVORElORxABEhcKE0tZQ19TVEFUVVNfQVBQUk9WRUQQAhIXChNLWUNfU1RBVFVTX1JFSkVDVEVEEANCKlooZ28uYnJpai5maS9wcm90b3MvYnJpai9zdG9yYWdlL3YxL2NvbW1vbmIGcHJvdG8z");

// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


/**
 * Describes the file google/protobuf/timestamp.proto.
 */
const file_google_protobuf_timestamp = /*@__PURE__*/
  fileDesc("Ch9nb29nbGUvcHJvdG9idWYvdGltZXN0YW1wLnByb3RvEg9nb29nbGUucHJvdG9idWYiKwoJVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAVChQEKE2NvbS5nb29nbGUucHJvdG9idWZCDlRpbWVzdGFtcFByb3RvUAFaMmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3RpbWVzdGFtcHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/storage/v1/common/data.proto (package brij.storage.v1.common, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/storage/v1/common/data.proto.
 */
const file_brij_storage_v1_common_data = /*@__PURE__*/
  fileDesc("CiFicmlqL3N0b3JhZ2UvdjEvY29tbW9uL2RhdGEucHJvdG8SFmJyaWouc3RvcmFnZS52MS5jb21tb24iLQoETmFtZRISCgpmaXJzdF9uYW1lGAEgASgJEhEKCWxhc3RfbmFtZRgCIAEoCSI2CglCaXJ0aERhdGUSKQoFdmFsdWUYASABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wIvcBCghEb2N1bWVudBIyCgR0eXBlGAEgASgOMiQuYnJpai5zdG9yYWdlLnYxLmNvbW1vbi5Eb2N1bWVudFR5cGUSDgoGbnVtYmVyGAIgASgJEhQKDGNvdW50cnlfY29kZRgDIAEoCRI4Cg9leHBpcmF0aW9uX2RhdGUYBCABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wSACIAQESOQoFcGhvdG8YBSABKAsyJS5icmlqLnN0b3JhZ2UudjEuY29tbW9uLkRvY3VtZW50UGhvdG9IAYgBAUISChBfZXhwaXJhdGlvbl9kYXRlQggKBl9waG90byJhCg1Eb2N1bWVudFBob3RvEhgKC2Zyb250X2ltYWdlGAQgASgMSACIAQESFwoKYmFja19pbWFnZRgFIAEoDEgBiAEBQg4KDF9mcm9udF9pbWFnZUINCgtfYmFja19pbWFnZSJeCghCYW5rSW5mbxIWCg5hY2NvdW50X251bWJlchgBIAEoCRIRCgliYW5rX2NvZGUYAiABKAkSEQoJYmFua19uYW1lGAMgASgJEhQKDGNvdW50cnlfY29kZRgEIAEoCSIWCgVFbWFpbBINCgV2YWx1ZRgBIAEoCSIcCgtTZWxmaWVJbWFnZRINCgV2YWx1ZRgBIAEoDCIWCgVQaG9uZRINCgV2YWx1ZRgBIAEoCSIcCgtDaXRpemVuc2hpcBINCgV2YWx1ZRgBIAEoCSrlAQoIRGF0YVR5cGUSGQoVREFUQV9UWVBFX1VOU1BFQ0lGSUVEEAASEwoPREFUQV9UWVBFX1BIT05FEAESEwoPREFUQV9UWVBFX0VNQUlMEAISEgoOREFUQV9UWVBFX05BTUUQAxIYChREQVRBX1RZUEVfQklSVEhfREFURRAEEhYKEkRBVEFfVFlQRV9ET0NVTUVOVBAFEhcKE0RBVEFfVFlQRV9CQU5LX0lORk8QBhIaChZEQVRBX1RZUEVfU0VMRklFX0lNQUdFEAcSGQoVREFUQV9UWVBFX0NJVElaRU5TSElQEAgqmgEKDERvY3VtZW50VHlwZRIdChlET0NVTUVOVF9UWVBFX1VOU1BFQ0lGSUVEEAASGgoWRE9DVU1FTlRfVFlQRV9WT1RFUl9JRBABEhgKFERPQ1VNRU5UX1RZUEVfTklOX1YyEAISGgoWRE9DVU1FTlRfVFlQRV9QQVNTUE9SVBADEhkKFURPQ1VNRU5UX1RZUEVfSURfQ0FSRBAEQipaKGdvLmJyaWouZmkvcHJvdG9zL2JyaWovc3RvcmFnZS92MS9jb21tb25iBnByb3RvMw", [file_google_protobuf_timestamp]);

/**
 * Describes the message brij.storage.v1.common.Name.
 * Use `create(NameSchema)` to create a new message.
 */
const NameSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 0);

/**
 * Describes the message brij.storage.v1.common.BirthDate.
 * Use `create(BirthDateSchema)` to create a new message.
 */
const BirthDateSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 1);

/**
 * Describes the message brij.storage.v1.common.Document.
 * Use `create(DocumentSchema)` to create a new message.
 */
const DocumentSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 2);

/**
 * Describes the message brij.storage.v1.common.BankInfo.
 * Use `create(BankInfoSchema)` to create a new message.
 */
const BankInfoSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 4);

/**
 * Describes the message brij.storage.v1.common.Email.
 * Use `create(EmailSchema)` to create a new message.
 */
const EmailSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 5);

/**
 * Describes the message brij.storage.v1.common.SelfieImage.
 * Use `create(SelfieImageSchema)` to create a new message.
 */
const SelfieImageSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 6);

/**
 * Describes the message brij.storage.v1.common.Phone.
 * Use `create(PhoneSchema)` to create a new message.
 */
const PhoneSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 7);

/**
 * Describes the message brij.storage.v1.common.Citizenship.
 * Use `create(CitizenshipSchema)` to create a new message.
 */
const CitizenshipSchema = /*@__PURE__*/
  messageDesc(file_brij_storage_v1_common_data, 8);

/**
 * Describes the enum brij.storage.v1.common.DataType.
 */
const DataTypeSchema = /*@__PURE__*/
  enumDesc(file_brij_storage_v1_common_data, 0);

/**
 * @generated from enum brij.storage.v1.common.DataType
 */
const DataType = /*@__PURE__*/
  tsEnum(DataTypeSchema);

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/storage/v1/common/user_data_field.proto (package brij.storage.v1.common, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/storage/v1/common/user_data_field.proto.
 */
const file_brij_storage_v1_common_user_data_field = /*@__PURE__*/
  fileDesc("CixicmlqL3N0b3JhZ2UvdjEvY29tbW9uL3VzZXJfZGF0YV9maWVsZC5wcm90bxIWYnJpai5zdG9yYWdlLnYxLmNvbW1vbiK1AQoNVXNlckRhdGFGaWVsZBIKCgJpZBgBIAEoCRIuCgR0eXBlGAIgASgOMiAuYnJpai5zdG9yYWdlLnYxLmNvbW1vbi5EYXRhVHlwZRIXCg9lbmNyeXB0ZWRfdmFsdWUYAyABKAwSDAoEaGFzaBgEIAEoCRIRCglzaWduYXR1cmUYBSABKAkSLgoKY3JlYXRlZF9hdBgGIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXBCKlooZ28uYnJpai5maS9wcm90b3MvYnJpai9zdG9yYWdlL3YxL2NvbW1vbmIGcHJvdG8z", [file_brij_storage_v1_common_data, file_google_protobuf_timestamp]);

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/storage/v1/common/validation_status.proto (package brij.storage.v1.common, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/storage/v1/common/validation_status.proto.
 */
const file_brij_storage_v1_common_validation_status = /*@__PURE__*/
  fileDesc("Ci5icmlqL3N0b3JhZ2UvdjEvY29tbW9uL3ZhbGlkYXRpb25fc3RhdHVzLnByb3RvEhZicmlqLnN0b3JhZ2UudjEuY29tbW9uKpQBChBWYWxpZGF0aW9uU3RhdHVzEiEKHVZBTElEQVRJT05fU1RBVFVTX1VOU1BFQ0lGSUVEEAASHQoZVkFMSURBVElPTl9TVEFUVVNfUEVORElORxABEh4KGlZBTElEQVRJT05fU1RBVFVTX0FQUFJPVkVEEAISHgoaVkFMSURBVElPTl9TVEFUVVNfUkVKRUNURUQQA0IqWihnby5icmlqLmZpL3Byb3Rvcy9icmlqL3N0b3JhZ2UvdjEvY29tbW9uYgZwcm90bzM");

/**
 * Describes the enum brij.storage.v1.common.ValidationStatus.
 */
const ValidationStatusSchema = /*@__PURE__*/
  enumDesc(file_brij_storage_v1_common_validation_status, 0);

/**
 * @generated from enum brij.storage.v1.common.ValidationStatus
 */
const ValidationStatus = /*@__PURE__*/
  tsEnum(ValidationStatusSchema);

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/storage/v1/common/validation_data_field.proto (package brij.storage.v1.common, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/storage/v1/common/validation_data_field.proto.
 */
const file_brij_storage_v1_common_validation_data_field = /*@__PURE__*/
  fileDesc("CjJicmlqL3N0b3JhZ2UvdjEvY29tbW9uL3ZhbGlkYXRpb25fZGF0YV9maWVsZC5wcm90bxIWYnJpai5zdG9yYWdlLnYxLmNvbW1vbiLdAQoTVmFsaWRhdGlvbkRhdGFGaWVsZBIKCgJpZBgBIAEoCRIcChR2YWxpZGF0b3JfcHVibGljX2tleRgCIAEoCRIPCgdkYXRhX2lkGAMgASgJEjgKBnN0YXR1cxgEIAEoDjIoLmJyaWouc3RvcmFnZS52MS5jb21tb24uVmFsaWRhdGlvblN0YXR1cxIMCgRoYXNoGAUgASgJEhEKCXNpZ25hdHVyZRgGIAEoCRIwCgx2YWxpZGF0ZWRfYXQYByABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wQipaKGdvLmJyaWouZmkvcHJvdG9zL2JyaWovc3RvcmFnZS92MS9jb21tb25iBnByb3RvMw", [file_brij_storage_v1_common_validation_status, file_google_protobuf_timestamp]);

// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * Describes the file google/api/http.proto.
 */
const file_google_api_http = /*@__PURE__*/
  fileDesc("ChVnb29nbGUvYXBpL2h0dHAucHJvdG8SCmdvb2dsZS5hcGkiVAoESHR0cBIjCgVydWxlcxgBIAMoCzIULmdvb2dsZS5hcGkuSHR0cFJ1bGUSJwofZnVsbHlfZGVjb2RlX3Jlc2VydmVkX2V4cGFuc2lvbhgCIAEoCCKBAgoISHR0cFJ1bGUSEAoIc2VsZWN0b3IYASABKAkSDQoDZ2V0GAIgASgJSAASDQoDcHV0GAMgASgJSAASDgoEcG9zdBgEIAEoCUgAEhAKBmRlbGV0ZRgFIAEoCUgAEg8KBXBhdGNoGAYgASgJSAASLwoGY3VzdG9tGAggASgLMh0uZ29vZ2xlLmFwaS5DdXN0b21IdHRwUGF0dGVybkgAEgwKBGJvZHkYByABKAkSFQoNcmVzcG9uc2VfYm9keRgMIAEoCRIxChNhZGRpdGlvbmFsX2JpbmRpbmdzGAsgAygLMhQuZ29vZ2xlLmFwaS5IdHRwUnVsZUIJCgdwYXR0ZXJuIi8KEUN1c3RvbUh0dHBQYXR0ZXJuEgwKBGtpbmQYASABKAkSDAoEcGF0aBgCIAEoCUJnCg5jb20uZ29vZ2xlLmFwaUIJSHR0cFByb3RvUAFaQWdvb2dsZS5nb2xhbmcub3JnL2dlbnByb3RvL2dvb2dsZWFwaXMvYXBpL2Fubm90YXRpb25zO2Fubm90YXRpb25zogIER0FQSWIGcHJvdG8z");

// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


/**
 * Describes the file google/protobuf/descriptor.proto.
 */
const file_google_protobuf_descriptor = /*@__PURE__*/
  fileDesc("CiBnb29nbGUvcHJvdG9idWYvZGVzY3JpcHRvci5wcm90bxIPZ29vZ2xlLnByb3RvYnVmIlUKEUZpbGVEZXNjcmlwdG9yU2V0EjIKBGZpbGUYASADKAsyJC5nb29nbGUucHJvdG9idWYuRmlsZURlc2NyaXB0b3JQcm90byoMCIDsyv8BEIHsyv8BIoYEChNGaWxlRGVzY3JpcHRvclByb3RvEgwKBG5hbWUYASABKAkSDwoHcGFja2FnZRgCIAEoCRISCgpkZXBlbmRlbmN5GAMgAygJEhkKEXB1YmxpY19kZXBlbmRlbmN5GAogAygFEhcKD3dlYWtfZGVwZW5kZW5jeRgLIAMoBRI2CgxtZXNzYWdlX3R5cGUYBCADKAsyIC5nb29nbGUucHJvdG9idWYuRGVzY3JpcHRvclByb3RvEjcKCWVudW1fdHlwZRgFIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5FbnVtRGVzY3JpcHRvclByb3RvEjgKB3NlcnZpY2UYBiADKAsyJy5nb29nbGUucHJvdG9idWYuU2VydmljZURlc2NyaXB0b3JQcm90bxI4CglleHRlbnNpb24YByADKAsyJS5nb29nbGUucHJvdG9idWYuRmllbGREZXNjcmlwdG9yUHJvdG8SLQoHb3B0aW9ucxgIIAEoCzIcLmdvb2dsZS5wcm90b2J1Zi5GaWxlT3B0aW9ucxI5ChBzb3VyY2VfY29kZV9pbmZvGAkgASgLMh8uZ29vZ2xlLnByb3RvYnVmLlNvdXJjZUNvZGVJbmZvEg4KBnN5bnRheBgMIAEoCRIpCgdlZGl0aW9uGA4gASgOMhguZ29vZ2xlLnByb3RvYnVmLkVkaXRpb24iqQUKD0Rlc2NyaXB0b3JQcm90bxIMCgRuYW1lGAEgASgJEjQKBWZpZWxkGAIgAygLMiUuZ29vZ2xlLnByb3RvYnVmLkZpZWxkRGVzY3JpcHRvclByb3RvEjgKCWV4dGVuc2lvbhgGIAMoCzIlLmdvb2dsZS5wcm90b2J1Zi5GaWVsZERlc2NyaXB0b3JQcm90bxI1CgtuZXN0ZWRfdHlwZRgDIAMoCzIgLmdvb2dsZS5wcm90b2J1Zi5EZXNjcmlwdG9yUHJvdG8SNwoJZW51bV90eXBlGAQgAygLMiQuZ29vZ2xlLnByb3RvYnVmLkVudW1EZXNjcmlwdG9yUHJvdG8SSAoPZXh0ZW5zaW9uX3JhbmdlGAUgAygLMi8uZ29vZ2xlLnByb3RvYnVmLkRlc2NyaXB0b3JQcm90by5FeHRlbnNpb25SYW5nZRI5CgpvbmVvZl9kZWNsGAggAygLMiUuZ29vZ2xlLnByb3RvYnVmLk9uZW9mRGVzY3JpcHRvclByb3RvEjAKB29wdGlvbnMYByABKAsyHy5nb29nbGUucHJvdG9idWYuTWVzc2FnZU9wdGlvbnMSRgoOcmVzZXJ2ZWRfcmFuZ2UYCSADKAsyLi5nb29nbGUucHJvdG9idWYuRGVzY3JpcHRvclByb3RvLlJlc2VydmVkUmFuZ2USFQoNcmVzZXJ2ZWRfbmFtZRgKIAMoCRplCg5FeHRlbnNpb25SYW5nZRINCgVzdGFydBgBIAEoBRILCgNlbmQYAiABKAUSNwoHb3B0aW9ucxgDIAEoCzImLmdvb2dsZS5wcm90b2J1Zi5FeHRlbnNpb25SYW5nZU9wdGlvbnMaKwoNUmVzZXJ2ZWRSYW5nZRINCgVzdGFydBgBIAEoBRILCgNlbmQYAiABKAUi5QMKFUV4dGVuc2lvblJhbmdlT3B0aW9ucxJDChR1bmludGVycHJldGVkX29wdGlvbhjnByADKAsyJC5nb29nbGUucHJvdG9idWYuVW5pbnRlcnByZXRlZE9wdGlvbhJMCgtkZWNsYXJhdGlvbhgCIAMoCzIyLmdvb2dsZS5wcm90b2J1Zi5FeHRlbnNpb25SYW5nZU9wdGlvbnMuRGVjbGFyYXRpb25CA4gBAhItCghmZWF0dXJlcxgyIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0El8KDHZlcmlmaWNhdGlvbhgDIAEoDjI4Lmdvb2dsZS5wcm90b2J1Zi5FeHRlbnNpb25SYW5nZU9wdGlvbnMuVmVyaWZpY2F0aW9uU3RhdGU6ClVOVkVSSUZJRURCA4gBAhpoCgtEZWNsYXJhdGlvbhIOCgZudW1iZXIYASABKAUSEQoJZnVsbF9uYW1lGAIgASgJEgwKBHR5cGUYAyABKAkSEAoIcmVzZXJ2ZWQYBSABKAgSEAoIcmVwZWF0ZWQYBiABKAhKBAgEEAUiNAoRVmVyaWZpY2F0aW9uU3RhdGUSDwoLREVDTEFSQVRJT04QABIOCgpVTlZFUklGSUVEEAEqCQjoBxCAgICAAiLVBQoURmllbGREZXNjcmlwdG9yUHJvdG8SDAoEbmFtZRgBIAEoCRIOCgZudW1iZXIYAyABKAUSOgoFbGFiZWwYBCABKA4yKy5nb29nbGUucHJvdG9idWYuRmllbGREZXNjcmlwdG9yUHJvdG8uTGFiZWwSOAoEdHlwZRgFIAEoDjIqLmdvb2dsZS5wcm90b2J1Zi5GaWVsZERlc2NyaXB0b3JQcm90by5UeXBlEhEKCXR5cGVfbmFtZRgGIAEoCRIQCghleHRlbmRlZRgCIAEoCRIVCg1kZWZhdWx0X3ZhbHVlGAcgASgJEhMKC29uZW9mX2luZGV4GAkgASgFEhEKCWpzb25fbmFtZRgKIAEoCRIuCgdvcHRpb25zGAggASgLMh0uZ29vZ2xlLnByb3RvYnVmLkZpZWxkT3B0aW9ucxIXCg9wcm90bzNfb3B0aW9uYWwYESABKAgitgIKBFR5cGUSDwoLVFlQRV9ET1VCTEUQARIOCgpUWVBFX0ZMT0FUEAISDgoKVFlQRV9JTlQ2NBADEg8KC1RZUEVfVUlOVDY0EAQSDgoKVFlQRV9JTlQzMhAFEhAKDFRZUEVfRklYRUQ2NBAGEhAKDFRZUEVfRklYRUQzMhAHEg0KCVRZUEVfQk9PTBAIEg8KC1RZUEVfU1RSSU5HEAkSDgoKVFlQRV9HUk9VUBAKEhAKDFRZUEVfTUVTU0FHRRALEg4KClRZUEVfQllURVMQDBIPCgtUWVBFX1VJTlQzMhANEg0KCVRZUEVfRU5VTRAOEhEKDVRZUEVfU0ZJWEVEMzIQDxIRCg1UWVBFX1NGSVhFRDY0EBASDwoLVFlQRV9TSU5UMzIQERIPCgtUWVBFX1NJTlQ2NBASIkMKBUxhYmVsEhIKDkxBQkVMX09QVElPTkFMEAESEgoOTEFCRUxfUkVQRUFURUQQAxISCg5MQUJFTF9SRVFVSVJFRBACIlQKFE9uZW9mRGVzY3JpcHRvclByb3RvEgwKBG5hbWUYASABKAkSLgoHb3B0aW9ucxgCIAEoCzIdLmdvb2dsZS5wcm90b2J1Zi5PbmVvZk9wdGlvbnMipAIKE0VudW1EZXNjcmlwdG9yUHJvdG8SDAoEbmFtZRgBIAEoCRI4CgV2YWx1ZRgCIAMoCzIpLmdvb2dsZS5wcm90b2J1Zi5FbnVtVmFsdWVEZXNjcmlwdG9yUHJvdG8SLQoHb3B0aW9ucxgDIAEoCzIcLmdvb2dsZS5wcm90b2J1Zi5FbnVtT3B0aW9ucxJOCg5yZXNlcnZlZF9yYW5nZRgEIAMoCzI2Lmdvb2dsZS5wcm90b2J1Zi5FbnVtRGVzY3JpcHRvclByb3RvLkVudW1SZXNlcnZlZFJhbmdlEhUKDXJlc2VydmVkX25hbWUYBSADKAkaLwoRRW51bVJlc2VydmVkUmFuZ2USDQoFc3RhcnQYASABKAUSCwoDZW5kGAIgASgFImwKGEVudW1WYWx1ZURlc2NyaXB0b3JQcm90bxIMCgRuYW1lGAEgASgJEg4KBm51bWJlchgCIAEoBRIyCgdvcHRpb25zGAMgASgLMiEuZ29vZ2xlLnByb3RvYnVmLkVudW1WYWx1ZU9wdGlvbnMikAEKFlNlcnZpY2VEZXNjcmlwdG9yUHJvdG8SDAoEbmFtZRgBIAEoCRI2CgZtZXRob2QYAiADKAsyJi5nb29nbGUucHJvdG9idWYuTWV0aG9kRGVzY3JpcHRvclByb3RvEjAKB29wdGlvbnMYAyABKAsyHy5nb29nbGUucHJvdG9idWYuU2VydmljZU9wdGlvbnMiwQEKFU1ldGhvZERlc2NyaXB0b3JQcm90bxIMCgRuYW1lGAEgASgJEhIKCmlucHV0X3R5cGUYAiABKAkSEwoLb3V0cHV0X3R5cGUYAyABKAkSLwoHb3B0aW9ucxgEIAEoCzIeLmdvb2dsZS5wcm90b2J1Zi5NZXRob2RPcHRpb25zEh8KEGNsaWVudF9zdHJlYW1pbmcYBSABKAg6BWZhbHNlEh8KEHNlcnZlcl9zdHJlYW1pbmcYBiABKAg6BWZhbHNlIssGCgtGaWxlT3B0aW9ucxIUCgxqYXZhX3BhY2thZ2UYASABKAkSHAoUamF2YV9vdXRlcl9jbGFzc25hbWUYCCABKAkSIgoTamF2YV9tdWx0aXBsZV9maWxlcxgKIAEoCDoFZmFsc2USKQodamF2YV9nZW5lcmF0ZV9lcXVhbHNfYW5kX2hhc2gYFCABKAhCAhgBEiUKFmphdmFfc3RyaW5nX2NoZWNrX3V0ZjgYGyABKAg6BWZhbHNlEkYKDG9wdGltaXplX2ZvchgJIAEoDjIpLmdvb2dsZS5wcm90b2J1Zi5GaWxlT3B0aW9ucy5PcHRpbWl6ZU1vZGU6BVNQRUVEEhIKCmdvX3BhY2thZ2UYCyABKAkSIgoTY2NfZ2VuZXJpY19zZXJ2aWNlcxgQIAEoCDoFZmFsc2USJAoVamF2YV9nZW5lcmljX3NlcnZpY2VzGBEgASgIOgVmYWxzZRIiChNweV9nZW5lcmljX3NlcnZpY2VzGBIgASgIOgVmYWxzZRIZCgpkZXByZWNhdGVkGBcgASgIOgVmYWxzZRIeChBjY19lbmFibGVfYXJlbmFzGB8gASgIOgR0cnVlEhkKEW9iamNfY2xhc3NfcHJlZml4GCQgASgJEhgKEGNzaGFycF9uYW1lc3BhY2UYJSABKAkSFAoMc3dpZnRfcHJlZml4GCcgASgJEhgKEHBocF9jbGFzc19wcmVmaXgYKCABKAkSFQoNcGhwX25hbWVzcGFjZRgpIAEoCRIeChZwaHBfbWV0YWRhdGFfbmFtZXNwYWNlGCwgASgJEhQKDHJ1YnlfcGFja2FnZRgtIAEoCRItCghmZWF0dXJlcxgyIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0EkMKFHVuaW50ZXJwcmV0ZWRfb3B0aW9uGOcHIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5VbmludGVycHJldGVkT3B0aW9uIjoKDE9wdGltaXplTW9kZRIJCgVTUEVFRBABEg0KCUNPREVfU0laRRACEhAKDExJVEVfUlVOVElNRRADKgkI6AcQgICAgAJKBAgqECtKBAgmECdSFHBocF9nZW5lcmljX3NlcnZpY2VzIucCCg5NZXNzYWdlT3B0aW9ucxImChdtZXNzYWdlX3NldF93aXJlX2Zvcm1hdBgBIAEoCDoFZmFsc2USLgofbm9fc3RhbmRhcmRfZGVzY3JpcHRvcl9hY2Nlc3NvchgCIAEoCDoFZmFsc2USGQoKZGVwcmVjYXRlZBgDIAEoCDoFZmFsc2USEQoJbWFwX2VudHJ5GAcgASgIEjIKJmRlcHJlY2F0ZWRfbGVnYWN5X2pzb25fZmllbGRfY29uZmxpY3RzGAsgASgIQgIYARItCghmZWF0dXJlcxgMIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0EkMKFHVuaW50ZXJwcmV0ZWRfb3B0aW9uGOcHIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5VbmludGVycHJldGVkT3B0aW9uKgkI6AcQgICAgAJKBAgEEAVKBAgFEAZKBAgGEAdKBAgIEAlKBAgJEAoiowsKDEZpZWxkT3B0aW9ucxI6CgVjdHlwZRgBIAEoDjIjLmdvb2dsZS5wcm90b2J1Zi5GaWVsZE9wdGlvbnMuQ1R5cGU6BlNUUklORxIOCgZwYWNrZWQYAiABKAgSPwoGanN0eXBlGAYgASgOMiQuZ29vZ2xlLnByb3RvYnVmLkZpZWxkT3B0aW9ucy5KU1R5cGU6CUpTX05PUk1BTBITCgRsYXp5GAUgASgIOgVmYWxzZRIeCg91bnZlcmlmaWVkX2xhenkYDyABKAg6BWZhbHNlEhkKCmRlcHJlY2F0ZWQYAyABKAg6BWZhbHNlEhMKBHdlYWsYCiABKAg6BWZhbHNlEhsKDGRlYnVnX3JlZGFjdBgQIAEoCDoFZmFsc2USQAoJcmV0ZW50aW9uGBEgASgOMi0uZ29vZ2xlLnByb3RvYnVmLkZpZWxkT3B0aW9ucy5PcHRpb25SZXRlbnRpb24SPwoHdGFyZ2V0cxgTIAMoDjIuLmdvb2dsZS5wcm90b2J1Zi5GaWVsZE9wdGlvbnMuT3B0aW9uVGFyZ2V0VHlwZRJGChBlZGl0aW9uX2RlZmF1bHRzGBQgAygLMiwuZ29vZ2xlLnByb3RvYnVmLkZpZWxkT3B0aW9ucy5FZGl0aW9uRGVmYXVsdBItCghmZWF0dXJlcxgVIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0EkUKD2ZlYXR1cmVfc3VwcG9ydBgWIAEoCzIsLmdvb2dsZS5wcm90b2J1Zi5GaWVsZE9wdGlvbnMuRmVhdHVyZVN1cHBvcnQSQwoUdW5pbnRlcnByZXRlZF9vcHRpb24Y5wcgAygLMiQuZ29vZ2xlLnByb3RvYnVmLlVuaW50ZXJwcmV0ZWRPcHRpb24aSgoORWRpdGlvbkRlZmF1bHQSKQoHZWRpdGlvbhgDIAEoDjIYLmdvb2dsZS5wcm90b2J1Zi5FZGl0aW9uEg0KBXZhbHVlGAIgASgJGswBCg5GZWF0dXJlU3VwcG9ydBI0ChJlZGl0aW9uX2ludHJvZHVjZWQYASABKA4yGC5nb29nbGUucHJvdG9idWYuRWRpdGlvbhI0ChJlZGl0aW9uX2RlcHJlY2F0ZWQYAiABKA4yGC5nb29nbGUucHJvdG9idWYuRWRpdGlvbhIbChNkZXByZWNhdGlvbl93YXJuaW5nGAMgASgJEjEKD2VkaXRpb25fcmVtb3ZlZBgEIAEoDjIYLmdvb2dsZS5wcm90b2J1Zi5FZGl0aW9uIi8KBUNUeXBlEgoKBlNUUklORxAAEggKBENPUkQQARIQCgxTVFJJTkdfUElFQ0UQAiI1CgZKU1R5cGUSDQoJSlNfTk9STUFMEAASDQoJSlNfU1RSSU5HEAESDQoJSlNfTlVNQkVSEAIiVQoPT3B0aW9uUmV0ZW50aW9uEhUKEVJFVEVOVElPTl9VTktOT1dOEAASFQoRUkVURU5USU9OX1JVTlRJTUUQARIUChBSRVRFTlRJT05fU09VUkNFEAIijAIKEE9wdGlvblRhcmdldFR5cGUSFwoTVEFSR0VUX1RZUEVfVU5LTk9XThAAEhQKEFRBUkdFVF9UWVBFX0ZJTEUQARIfChtUQVJHRVRfVFlQRV9FWFRFTlNJT05fUkFOR0UQAhIXChNUQVJHRVRfVFlQRV9NRVNTQUdFEAMSFQoRVEFSR0VUX1RZUEVfRklFTEQQBBIVChFUQVJHRVRfVFlQRV9PTkVPRhAFEhQKEFRBUkdFVF9UWVBFX0VOVU0QBhIaChZUQVJHRVRfVFlQRV9FTlVNX0VOVFJZEAcSFwoTVEFSR0VUX1RZUEVfU0VSVklDRRAIEhYKElRBUkdFVF9UWVBFX01FVEhPRBAJKgkI6AcQgICAgAJKBAgEEAVKBAgSEBMijQEKDE9uZW9mT3B0aW9ucxItCghmZWF0dXJlcxgBIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0EkMKFHVuaW50ZXJwcmV0ZWRfb3B0aW9uGOcHIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5VbmludGVycHJldGVkT3B0aW9uKgkI6AcQgICAgAIi9gEKC0VudW1PcHRpb25zEhMKC2FsbG93X2FsaWFzGAIgASgIEhkKCmRlcHJlY2F0ZWQYAyABKAg6BWZhbHNlEjIKJmRlcHJlY2F0ZWRfbGVnYWN5X2pzb25fZmllbGRfY29uZmxpY3RzGAYgASgIQgIYARItCghmZWF0dXJlcxgHIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0EkMKFHVuaW50ZXJwcmV0ZWRfb3B0aW9uGOcHIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5VbmludGVycHJldGVkT3B0aW9uKgkI6AcQgICAgAJKBAgFEAYikAIKEEVudW1WYWx1ZU9wdGlvbnMSGQoKZGVwcmVjYXRlZBgBIAEoCDoFZmFsc2USLQoIZmVhdHVyZXMYAiABKAsyGy5nb29nbGUucHJvdG9idWYuRmVhdHVyZVNldBIbCgxkZWJ1Z19yZWRhY3QYAyABKAg6BWZhbHNlEkUKD2ZlYXR1cmVfc3VwcG9ydBgEIAEoCzIsLmdvb2dsZS5wcm90b2J1Zi5GaWVsZE9wdGlvbnMuRmVhdHVyZVN1cHBvcnQSQwoUdW5pbnRlcnByZXRlZF9vcHRpb24Y5wcgAygLMiQuZ29vZ2xlLnByb3RvYnVmLlVuaW50ZXJwcmV0ZWRPcHRpb24qCQjoBxCAgICAAiKqAQoOU2VydmljZU9wdGlvbnMSLQoIZmVhdHVyZXMYIiABKAsyGy5nb29nbGUucHJvdG9idWYuRmVhdHVyZVNldBIZCgpkZXByZWNhdGVkGCEgASgIOgVmYWxzZRJDChR1bmludGVycHJldGVkX29wdGlvbhjnByADKAsyJC5nb29nbGUucHJvdG9idWYuVW5pbnRlcnByZXRlZE9wdGlvbioJCOgHEICAgIACItwCCg1NZXRob2RPcHRpb25zEhkKCmRlcHJlY2F0ZWQYISABKAg6BWZhbHNlEl8KEWlkZW1wb3RlbmN5X2xldmVsGCIgASgOMi8uZ29vZ2xlLnByb3RvYnVmLk1ldGhvZE9wdGlvbnMuSWRlbXBvdGVuY3lMZXZlbDoTSURFTVBPVEVOQ1lfVU5LTk9XThItCghmZWF0dXJlcxgjIAEoCzIbLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0EkMKFHVuaW50ZXJwcmV0ZWRfb3B0aW9uGOcHIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5VbmludGVycHJldGVkT3B0aW9uIlAKEElkZW1wb3RlbmN5TGV2ZWwSFwoTSURFTVBPVEVOQ1lfVU5LTk9XThAAEhMKD05PX1NJREVfRUZGRUNUUxABEg4KCklERU1QT1RFTlQQAioJCOgHEICAgIACIp4CChNVbmludGVycHJldGVkT3B0aW9uEjsKBG5hbWUYAiADKAsyLS5nb29nbGUucHJvdG9idWYuVW5pbnRlcnByZXRlZE9wdGlvbi5OYW1lUGFydBIYChBpZGVudGlmaWVyX3ZhbHVlGAMgASgJEhoKEnBvc2l0aXZlX2ludF92YWx1ZRgEIAEoBBIaChJuZWdhdGl2ZV9pbnRfdmFsdWUYBSABKAMSFAoMZG91YmxlX3ZhbHVlGAYgASgBEhQKDHN0cmluZ192YWx1ZRgHIAEoDBIXCg9hZ2dyZWdhdGVfdmFsdWUYCCABKAkaMwoITmFtZVBhcnQSEQoJbmFtZV9wYXJ0GAEgAigJEhQKDGlzX2V4dGVuc2lvbhgCIAIoCCK8CwoKRmVhdHVyZVNldBKCAQoOZmllbGRfcHJlc2VuY2UYASABKA4yKS5nb29nbGUucHJvdG9idWYuRmVhdHVyZVNldC5GaWVsZFByZXNlbmNlQj+IAQGYAQSYAQGiAQ0SCEVYUExJQ0lUGIQHogENEghJTVBMSUNJVBjnB6IBDRIIRVhQTElDSVQY6AeyAQMI6AcSYgoJZW51bV90eXBlGAIgASgOMiQuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQuRW51bVR5cGVCKYgBAZgBBpgBAaIBCxIGQ0xPU0VEGIQHogEJEgRPUEVOGOcHsgEDCOgHEoEBChdyZXBlYXRlZF9maWVsZF9lbmNvZGluZxgDIAEoDjIxLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0LlJlcGVhdGVkRmllbGRFbmNvZGluZ0ItiAEBmAEEmAEBogENEghFWFBBTkRFRBiEB6IBCxIGUEFDS0VEGOcHsgEDCOgHEm4KD3V0ZjhfdmFsaWRhdGlvbhgEIAEoDjIqLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0LlV0ZjhWYWxpZGF0aW9uQimIAQGYAQSYAQGiAQkSBE5PTkUYhAeiAQsSBlZFUklGWRjnB7IBAwjoBxJtChBtZXNzYWdlX2VuY29kaW5nGAUgASgOMisuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQuTWVzc2FnZUVuY29kaW5nQiaIAQGYAQSYAQGiARQSD0xFTkdUSF9QUkVGSVhFRBiEB7IBAwjoBxJ2Cgtqc29uX2Zvcm1hdBgGIAEoDjImLmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0Lkpzb25Gb3JtYXRCOYgBAZgBA5gBBpgBAaIBFxISTEVHQUNZX0JFU1RfRUZGT1JUGIQHogEKEgVBTExPVxjnB7IBAwjoBxKXAQoUZW5mb3JjZV9uYW1pbmdfc3R5bGUYByABKA4yLi5nb29nbGUucHJvdG9idWYuRmVhdHVyZVNldC5FbmZvcmNlTmFtaW5nU3R5bGVCSYgBApgBAZgBApgBA5gBBJgBBZgBBpgBB5gBCJgBCaIBERIMU1RZTEVfTEVHQUNZGIQHogEOEglTVFlMRTIwMjQY6QeyAQMI6QciXAoNRmllbGRQcmVzZW5jZRIaChZGSUVMRF9QUkVTRU5DRV9VTktOT1dOEAASDAoIRVhQTElDSVQQARIMCghJTVBMSUNJVBACEhMKD0xFR0FDWV9SRVFVSVJFRBADIjcKCEVudW1UeXBlEhUKEUVOVU1fVFlQRV9VTktOT1dOEAASCAoET1BFThABEgoKBkNMT1NFRBACIlYKFVJlcGVhdGVkRmllbGRFbmNvZGluZxIjCh9SRVBFQVRFRF9GSUVMRF9FTkNPRElOR19VTktOT1dOEAASCgoGUEFDS0VEEAESDAoIRVhQQU5ERUQQAiJJCg5VdGY4VmFsaWRhdGlvbhIbChdVVEY4X1ZBTElEQVRJT05fVU5LTk9XThAAEgoKBlZFUklGWRACEggKBE5PTkUQAyIECAEQASJTCg9NZXNzYWdlRW5jb2RpbmcSHAoYTUVTU0FHRV9FTkNPRElOR19VTktOT1dOEAASEwoPTEVOR1RIX1BSRUZJWEVEEAESDQoJREVMSU1JVEVEEAIiSAoKSnNvbkZvcm1hdBIXChNKU09OX0ZPUk1BVF9VTktOT1dOEAASCQoFQUxMT1cQARIWChJMRUdBQ1lfQkVTVF9FRkZPUlQQAiJXChJFbmZvcmNlTmFtaW5nU3R5bGUSIAocRU5GT1JDRV9OQU1JTkdfU1RZTEVfVU5LTk9XThAAEg0KCVNUWUxFMjAyNBABEhAKDFNUWUxFX0xFR0FDWRACKgYI6AcQi04qBgiLThCQTioGCJBOEJFOSgYI5wcQ6AcimAMKEkZlYXR1cmVTZXREZWZhdWx0cxJOCghkZWZhdWx0cxgBIAMoCzI8Lmdvb2dsZS5wcm90b2J1Zi5GZWF0dXJlU2V0RGVmYXVsdHMuRmVhdHVyZVNldEVkaXRpb25EZWZhdWx0EjEKD21pbmltdW1fZWRpdGlvbhgEIAEoDjIYLmdvb2dsZS5wcm90b2J1Zi5FZGl0aW9uEjEKD21heGltdW1fZWRpdGlvbhgFIAEoDjIYLmdvb2dsZS5wcm90b2J1Zi5FZGl0aW9uGssBChhGZWF0dXJlU2V0RWRpdGlvbkRlZmF1bHQSKQoHZWRpdGlvbhgDIAEoDjIYLmdvb2dsZS5wcm90b2J1Zi5FZGl0aW9uEjkKFG92ZXJyaWRhYmxlX2ZlYXR1cmVzGAQgASgLMhsuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQSMwoOZml4ZWRfZmVhdHVyZXMYBSABKAsyGy5nb29nbGUucHJvdG9idWYuRmVhdHVyZVNldEoECAEQAkoECAIQA1IIZmVhdHVyZXMi4wEKDlNvdXJjZUNvZGVJbmZvEjoKCGxvY2F0aW9uGAEgAygLMiguZ29vZ2xlLnByb3RvYnVmLlNvdXJjZUNvZGVJbmZvLkxvY2F0aW9uGoYBCghMb2NhdGlvbhIQCgRwYXRoGAEgAygFQgIQARIQCgRzcGFuGAIgAygFQgIQARIYChBsZWFkaW5nX2NvbW1lbnRzGAMgASgJEhkKEXRyYWlsaW5nX2NvbW1lbnRzGAQgASgJEiEKGWxlYWRpbmdfZGV0YWNoZWRfY29tbWVudHMYBiADKAkqDAiA7Mr/ARCB7Mr/ASKcAgoRR2VuZXJhdGVkQ29kZUluZm8SQQoKYW5ub3RhdGlvbhgBIAMoCzItLmdvb2dsZS5wcm90b2J1Zi5HZW5lcmF0ZWRDb2RlSW5mby5Bbm5vdGF0aW9uGsMBCgpBbm5vdGF0aW9uEhAKBHBhdGgYASADKAVCAhABEhMKC3NvdXJjZV9maWxlGAIgASgJEg0KBWJlZ2luGAMgASgFEgsKA2VuZBgEIAEoBRJICghzZW1hbnRpYxgFIAEoDjI2Lmdvb2dsZS5wcm90b2J1Zi5HZW5lcmF0ZWRDb2RlSW5mby5Bbm5vdGF0aW9uLlNlbWFudGljIigKCFNlbWFudGljEggKBE5PTkUQABIHCgNTRVQQARIJCgVBTElBUxACKqcCCgdFZGl0aW9uEhMKD0VESVRJT05fVU5LTk9XThAAEhMKDkVESVRJT05fTEVHQUNZEIQHEhMKDkVESVRJT05fUFJPVE8yEOYHEhMKDkVESVRJT05fUFJPVE8zEOcHEhEKDEVESVRJT05fMjAyMxDoBxIRCgxFRElUSU9OXzIwMjQQ6QcSFwoTRURJVElPTl8xX1RFU1RfT05MWRABEhcKE0VESVRJT05fMl9URVNUX09OTFkQAhIdChdFRElUSU9OXzk5OTk3X1RFU1RfT05MWRCdjQYSHQoXRURJVElPTl85OTk5OF9URVNUX09OTFkQno0GEh0KF0VESVRJT05fOTk5OTlfVEVTVF9PTkxZEJ+NBhITCgtFRElUSU9OX01BWBD/////B0J+ChNjb20uZ29vZ2xlLnByb3RvYnVmQhBEZXNjcmlwdG9yUHJvdG9zSAFaLWdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2Rlc2NyaXB0b3JwYvgBAaICA0dQQqoCGkdvb2dsZS5Qcm90b2J1Zi5SZWZsZWN0aW9u");

// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * Describes the file google/api/annotations.proto.
 */
const file_google_api_annotations = /*@__PURE__*/
  fileDesc("Chxnb29nbGUvYXBpL2Fubm90YXRpb25zLnByb3RvEgpnb29nbGUuYXBpOksKBGh0dHASHi5nb29nbGUucHJvdG9idWYuTWV0aG9kT3B0aW9ucxiwyrwiIAEoCzIULmdvb2dsZS5hcGkuSHR0cFJ1bGVSBGh0dHBCbgoOY29tLmdvb2dsZS5hcGlCEEFubm90YXRpb25zUHJvdG9QAVpBZ29vZ2xlLmdvbGFuZy5vcmcvZ2VucHJvdG8vZ29vZ2xlYXBpcy9hcGkvYW5ub3RhdGlvbnM7YW5ub3RhdGlvbnOiAgRHQVBJYgZwcm90bzM", [file_google_api_http, file_google_protobuf_descriptor]);

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/storage/v1/partner/service.proto (package brij.storage.v1.partner, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/storage/v1/partner/service.proto.
 */
const file_brij_storage_v1_partner_service = /*@__PURE__*/
  fileDesc("CiVicmlqL3N0b3JhZ2UvdjEvcGFydG5lci9zZXJ2aWNlLnByb3RvEhdicmlqLnN0b3JhZ2UudjEucGFydG5lciIkCg5HZXRJbmZvUmVxdWVzdBISCgpwdWJsaWNfa2V5GAEgASgJIlsKD0dldEluZm9SZXNwb25zZRIcChRlbmNyeXB0ZWRfc2VjcmV0X2tleRgBIAEoCRISCgpwdWJsaWNfa2V5GAIgASgJEhYKDndhbGxldF9hZGRyZXNzGAMgASgJIkUKEkdldFVzZXJEYXRhUmVxdWVzdBIXCg91c2VyX3B1YmxpY19rZXkYASABKAkSFgoOaW5jbHVkZV92YWx1ZXMYAiABKAgilQEKE0dldFVzZXJEYXRhUmVzcG9uc2USOAoJdXNlcl9kYXRhGAEgAygLMiUuYnJpai5zdG9yYWdlLnYxLmNvbW1vbi5Vc2VyRGF0YUZpZWxkEkQKD3ZhbGlkYXRpb25fZGF0YRgCIAMoCzIrLmJyaWouc3RvcmFnZS52MS5jb21tb24uVmFsaWRhdGlvbkRhdGFGaWVsZCKGAQoYU2V0VmFsaWRhdGlvbkRhdGFSZXF1ZXN0Eg8KB2RhdGFfaWQYASABKAkSOAoGc3RhdHVzGAIgASgOMiguYnJpai5zdG9yYWdlLnYxLmNvbW1vbi5WYWxpZGF0aW9uU3RhdHVzEgwKBGhhc2gYAyABKAkSEQoJc2lnbmF0dXJlGAQgASgJIhsKGVNldFZhbGlkYXRpb25EYXRhUmVzcG9uc2UiKQobUmVtb3ZlVmFsaWRhdGlvbkRhdGFSZXF1ZXN0EgoKAmlkGAEgASgJIh4KHFJlbW92ZVZhbGlkYXRpb25EYXRhUmVzcG9uc2UiXQoTR2V0S3ljU3RhdHVzUmVxdWVzdBIPCgdjb3VudHJ5GAEgASgJEhwKFHZhbGlkYXRvcl9wdWJsaWNfa2V5GAIgASgJEhcKD3VzZXJfcHVibGljX2tleRgDIAEoCSJqChRHZXRLeWNTdGF0dXNSZXNwb25zZRIxCgZzdGF0dXMYASABKA4yIS5icmlqLnN0b3JhZ2UudjEuY29tbW9uLkt5Y1N0YXR1cxIMCgRkYXRhGAIgASgMEhEKCXNpZ25hdHVyZRgDIAEoDCI5ChZDcmVhdGVLeWNTdGF0dXNSZXF1ZXN0EgwKBGRhdGEYASABKAwSEQoJc2lnbmF0dXJlGAIgASgMIikKF0NyZWF0ZUt5Y1N0YXR1c1Jlc3BvbnNlEg4KBmt5Y19pZBgBIAEoCSJJChZVcGRhdGVLeWNTdGF0dXNSZXF1ZXN0Eg4KBmt5Y19pZBgBIAEoCRIMCgRkYXRhGAIgASgMEhEKCXNpZ25hdHVyZRgDIAEoDCIZChdVcGRhdGVLeWNTdGF0dXNSZXNwb25zZTKzCAoOUGFydG5lclNlcnZpY2USeQoHR2V0SW5mbxInLmJyaWouc3RvcmFnZS52MS5wYXJ0bmVyLkdldEluZm9SZXF1ZXN0GiguYnJpai5zdG9yYWdlLnYxLnBhcnRuZXIuR2V0SW5mb1Jlc3BvbnNlIhuC0+STAhUiEy92MS9wYXJ0bmVyL2dldEluZm8SiQEKC0dldFVzZXJEYXRhEisuYnJpai5zdG9yYWdlLnYxLnBhcnRuZXIuR2V0VXNlckRhdGFSZXF1ZXN0GiwuYnJpai5zdG9yYWdlLnYxLnBhcnRuZXIuR2V0VXNlckRhdGFSZXNwb25zZSIfgtPkkwIZIhcvdjEvcGFydG5lci9nZXRVc2VyRGF0YRKhAQoRU2V0VmFsaWRhdGlvbkRhdGESMS5icmlqLnN0b3JhZ2UudjEucGFydG5lci5TZXRWYWxpZGF0aW9uRGF0YVJlcXVlc3QaMi5icmlqLnN0b3JhZ2UudjEucGFydG5lci5TZXRWYWxpZGF0aW9uRGF0YVJlc3BvbnNlIiWC0+STAh8iHS92MS9wYXJ0bmVyL3NldFZhbGlkYXRpb25EYXRhEq0BChRSZW1vdmVWYWxpZGF0aW9uRGF0YRI0LmJyaWouc3RvcmFnZS52MS5wYXJ0bmVyLlJlbW92ZVZhbGlkYXRpb25EYXRhUmVxdWVzdBo1LmJyaWouc3RvcmFnZS52MS5wYXJ0bmVyLlJlbW92ZVZhbGlkYXRpb25EYXRhUmVzcG9uc2UiKILT5JMCIiIgL3YxL3BhcnRuZXIvcmVtb3ZlVmFsaWRhdGlvbkRhdGESjQEKDEdldEt5Y1N0YXR1cxIsLmJyaWouc3RvcmFnZS52MS5wYXJ0bmVyLkdldEt5Y1N0YXR1c1JlcXVlc3QaLS5icmlqLnN0b3JhZ2UudjEucGFydG5lci5HZXRLeWNTdGF0dXNSZXNwb25zZSIggtPkkwIaIhgvdjEvcGFydG5lci9nZXRLeWNTdGF0dXMSmQEKD0NyZWF0ZUt5Y1N0YXR1cxIvLmJyaWouc3RvcmFnZS52MS5wYXJ0bmVyLkNyZWF0ZUt5Y1N0YXR1c1JlcXVlc3QaMC5icmlqLnN0b3JhZ2UudjEucGFydG5lci5DcmVhdGVLeWNTdGF0dXNSZXNwb25zZSIjgtPkkwIdIhsvdjEvcGFydG5lci9jcmVhdGVLeWNTdGF0dXMSmQEKD1VwZGF0ZUt5Y1N0YXR1cxIvLmJyaWouc3RvcmFnZS52MS5wYXJ0bmVyLlVwZGF0ZUt5Y1N0YXR1c1JlcXVlc3QaMC5icmlqLnN0b3JhZ2UudjEucGFydG5lci5VcGRhdGVLeWNTdGF0dXNSZXNwb25zZSIjgtPkkwIdIhsvdjEvcGFydG5lci91cGRhdGVLeWNTdGF0dXNCK1opZ28uYnJpai5maS9wcm90b3MvYnJpai9zdG9yYWdlL3YxL3BhcnRuZXJiBnByb3RvMw", [file_brij_storage_v1_common_kyc_item, file_brij_storage_v1_common_user_data_field, file_brij_storage_v1_common_validation_data_field, file_brij_storage_v1_common_validation_status, file_google_api_annotations]);

/**
 * @generated from service brij.storage.v1.partner.PartnerService
 */
const PartnerService$1 = /*@__PURE__*/
  serviceDesc(file_brij_storage_v1_partner_service, 0);

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/orders/v1/common/ramp_type.proto (package brij.orders.v1.common, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/orders/v1/common/ramp_type.proto.
 */
const file_brij_orders_v1_common_ramp_type = /*@__PURE__*/
  fileDesc("CiVicmlqL29yZGVycy92MS9jb21tb24vcmFtcF90eXBlLnByb3RvEhVicmlqLm9yZGVycy52MS5jb21tb24qVAoIUmFtcFR5cGUSGQoVUkFNUF9UWVBFX1VOU1BFQ0lGSUVEEAASFQoRUkFNUF9UWVBFX09OX1JBTVAQARIWChJSQU1QX1RZUEVfT0ZGX1JBTVAQAkIpWidnby5icmlqLmZpL3Byb3Rvcy9icmlqL29yZGVycy92MS9jb21tb25iBnByb3RvMw");

/**
 * Describes the enum brij.orders.v1.common.RampType.
 */
const RampTypeSchema = /*@__PURE__*/
  enumDesc(file_brij_orders_v1_common_ramp_type, 0);

/**
 * @generated from enum brij.orders.v1.common.RampType
 */
const RampType = /*@__PURE__*/
  tsEnum(RampTypeSchema);

// @generated by protoc-gen-es v2.4.0
// @generated from file brij/orders/v1/partner/partner.proto (package brij.orders.v1.partner, syntax proto3)
/* eslint-disable */


/**
 * Describes the file brij/orders/v1/partner/partner.proto.
 */
const file_brij_orders_v1_partner_partner = /*@__PURE__*/
  fileDesc("CiRicmlqL29yZGVycy92MS9wYXJ0bmVyL3BhcnRuZXIucHJvdG8SFmJyaWoub3JkZXJzLnYxLnBhcnRuZXIiOAoPR2V0T3JkZXJSZXF1ZXN0EhAKCG9yZGVyX2lkGAEgASgJEhMKC2V4dGVybmFsX2lkGAIgASgJIosEChBHZXRPcmRlclJlc3BvbnNlEhAKCG9yZGVyX2lkGAEgASgJEg8KB2NyZWF0ZWQYAiABKAkSDgoGc3RhdHVzGAMgASgJEhoKEnBhcnRuZXJfcHVibGljX2tleRgEIAEoCRIXCg91c2VyX3B1YmxpY19rZXkYBSABKAkSDwoHY29tbWVudBgHIAEoCRItCgR0eXBlGAggASgOMh8uYnJpai5vcmRlcnMudjEuY29tbW9uLlJhbXBUeXBlEhUKDWNyeXB0b19hbW91bnQYCSABKAESFwoPY3J5cHRvX2N1cnJlbmN5GAogASgJEhMKC2ZpYXRfYW1vdW50GAsgASgBEhUKDWZpYXRfY3VycmVuY3kYDCABKAkSEQoJYmFua19uYW1lGA0gASgJEhQKDGJhbmtfYWNjb3VudBgOIAEoCRIdChVjcnlwdG9fd2FsbGV0X2FkZHJlc3MYDyABKAkSEwoLdHJhbnNhY3Rpb24YECABKAkSFgoOdHJhbnNhY3Rpb25faWQYESABKAkSEwoLZXh0ZXJuYWxfaWQYEiABKAkSFgoOdXNlcl9zaWduYXR1cmUYEyABKAkSGQoRcGFydG5lcl9zaWduYXR1cmUYFCABKAkSGwoTdXNlcl93YWxsZXRfYWRkcmVzcxgVIAEoCRIZChF3YWxsZXRfcHVibGljX2tleRgWIAEoCSKeAQoSQWNjZXB0T3JkZXJSZXF1ZXN0EhAKCG9yZGVyX2lkGAEgASgJEhEKCWJhbmtfbmFtZRgCIAEoCRIUCgxiYW5rX2FjY291bnQYAyABKAkSHQoVY3J5cHRvX3dhbGxldF9hZGRyZXNzGAQgASgJEhMKC2V4dGVybmFsX2lkGAUgASgJEhkKEXBhcnRuZXJfc2lnbmF0dXJlGAYgASgJIhUKE0FjY2VwdE9yZGVyUmVzcG9uc2UiNgoSUmVqZWN0T3JkZXJSZXF1ZXN0EhAKCG9yZGVyX2lkGAEgASgJEg4KBnJlYXNvbhgCIAEoCSIVChNSZWplY3RPcmRlclJlc3BvbnNlIlUKFENvbXBsZXRlT3JkZXJSZXF1ZXN0EhAKCG9yZGVyX2lkGAEgASgJEhYKDnRyYW5zYWN0aW9uX2lkGAIgASgJEhMKC2V4dGVybmFsX2lkGAMgASgJIhcKFUNvbXBsZXRlT3JkZXJSZXNwb25zZSJJChBGYWlsT3JkZXJSZXF1ZXN0EhAKCG9yZGVyX2lkGAEgASgJEg4KBnJlYXNvbhgCIAEoCRITCgtleHRlcm5hbF9pZBgDIAEoCSITChFGYWlsT3JkZXJSZXNwb25zZSISChBHZXRPcmRlcnNSZXF1ZXN0Ik0KEUdldE9yZGVyc1Jlc3BvbnNlEjgKBm9yZGVycxgBIAMoCzIoLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuR2V0T3JkZXJSZXNwb25zZSKsAQoRVXBkYXRlRmVlc1JlcXVlc3QSPgoLb25fcmFtcF9mZWUYASABKAsyKS5icmlqLm9yZGVycy52MS5wYXJ0bmVyLlJhbXBGZWVVcGRhdGVEYXRhEj8KDG9mZl9yYW1wX2ZlZRgCIAEoCzIpLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuUmFtcEZlZVVwZGF0ZURhdGESFgoOd2FsbGV0X2FkZHJlc3MYAyABKAkigAEKEVJhbXBGZWVVcGRhdGVEYXRhEhEKCWZpeGVkX2ZlZRgBIAEoARIWCg5wZXJjZW50YWdlX2ZlZRgCIAEoARJAChBjb252ZXJzaW9uX3JhdGVzGAMgASgLMiYuYnJpai5vcmRlcnMudjEucGFydG5lci5Db252ZXJzaW9uUmF0ZSJOCg5Db252ZXJzaW9uUmF0ZRIXCg9jcnlwdG9fY3VycmVuY3kYASABKAkSFQoNZmlhdF9jdXJyZW5jeRgCIAEoCRIMCgRyYXRlGAMgASgBIhQKElVwZGF0ZUZlZXNSZXNwb25zZSJjChpHZW5lcmF0ZVRyYW5zYWN0aW9uUmVxdWVzdBIQCghvcmRlcl9pZBgBIAEoCRIeChZmdW5kaW5nX3dhbGxldF9hZGRyZXNzGAIgASgJEhMKC2V4dGVybmFsX2lkGAMgASgJIjIKG0dlbmVyYXRlVHJhbnNhY3Rpb25SZXNwb25zZRITCgt0cmFuc2FjdGlvbhgBIAEoCTLlCAoOUGFydG5lclNlcnZpY2USewoIR2V0T3JkZXISJy5icmlqLm9yZGVycy52MS5wYXJ0bmVyLkdldE9yZGVyUmVxdWVzdBooLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuR2V0T3JkZXJSZXNwb25zZSIcgtPkkwIWIhQvdjEvcGFydG5lci9nZXRPcmRlchKHAQoLQWNjZXB0T3JkZXISKi5icmlqLm9yZGVycy52MS5wYXJ0bmVyLkFjY2VwdE9yZGVyUmVxdWVzdBorLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuQWNjZXB0T3JkZXJSZXNwb25zZSIfgtPkkwIZIhcvdjEvcGFydG5lci9hY2NlcHRPcmRlchKHAQoLUmVqZWN0T3JkZXISKi5icmlqLm9yZGVycy52MS5wYXJ0bmVyLlJlamVjdE9yZGVyUmVxdWVzdBorLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuUmVqZWN0T3JkZXJSZXNwb25zZSIfgtPkkwIZIhcvdjEvcGFydG5lci9yZWplY3RPcmRlchKPAQoNQ29tcGxldGVPcmRlchIsLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuQ29tcGxldGVPcmRlclJlcXVlc3QaLS5icmlqLm9yZGVycy52MS5wYXJ0bmVyLkNvbXBsZXRlT3JkZXJSZXNwb25zZSIhgtPkkwIbIhkvdjEvcGFydG5lci9jb21wbGV0ZU9yZGVyEn8KCUZhaWxPcmRlchIoLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuRmFpbE9yZGVyUmVxdWVzdBopLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuRmFpbE9yZGVyUmVzcG9uc2UiHYLT5JMCFyIVL3YxL3BhcnRuZXIvZmFpbE9yZGVyEn8KCUdldE9yZGVycxIoLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuR2V0T3JkZXJzUmVxdWVzdBopLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuR2V0T3JkZXJzUmVzcG9uc2UiHYLT5JMCFyIVL3YxL3BhcnRuZXIvZ2V0T3JkZXJzEoMBCgpVcGRhdGVGZWVzEikuYnJpai5vcmRlcnMudjEucGFydG5lci5VcGRhdGVGZWVzUmVxdWVzdBoqLmJyaWoub3JkZXJzLnYxLnBhcnRuZXIuVXBkYXRlRmVlc1Jlc3BvbnNlIh6C0+STAhgiFi92MS9wYXJ0bmVyL3VwZGF0ZUZlZXMSpwEKE0dlbmVyYXRlVHJhbnNhY3Rpb24SMi5icmlqLm9yZGVycy52MS5wYXJ0bmVyLkdlbmVyYXRlVHJhbnNhY3Rpb25SZXF1ZXN0GjMuYnJpai5vcmRlcnMudjEucGFydG5lci5HZW5lcmF0ZVRyYW5zYWN0aW9uUmVzcG9uc2UiJ4LT5JMCISIfL3YxL3BhcnRuZXIvZ2VuZXJhdGVUcmFuc2FjdGlvbkIqWihnby5icmlqLmZpL3Byb3Rvcy9icmlqL29yZGVycy92MS9wYXJ0bmVyYgZwcm90bzM", [file_brij_orders_v1_common_ramp_type, file_google_api_annotations]);

/**
 * @generated from service brij.orders.v1.partner.PartnerService
 */
const PartnerService = /*@__PURE__*/
  serviceDesc(file_brij_orders_v1_partner_partner, 0);

const currencyDecimals = {
    // Crypto currencies
    USDC: 6,
    SOL: 9,
    // Fiat currencies
    USD: 2,
    EUR: 2,
    NGN: 2,
};
function convertToDecimalPrecision(amount, currency) {
    const decimals = currencyDecimals[currency];
    if (decimals === undefined) {
        throw new Error(`Unknown currency: ${currency}`);
    }
    return Math.round(amount * Math.pow(10, decimals)).toString();
}

exports.ValidationStatus = void 0;
(function (ValidationStatus) {
    ValidationStatus["Unspecified"] = "UNSPECIFIED";
    ValidationStatus["Pending"] = "PENDING";
    ValidationStatus["Approved"] = "APPROVED";
    ValidationStatus["Rejected"] = "REJECTED";
    ValidationStatus["Unverified"] = "UNVERIFIED";
})(exports.ValidationStatus || (exports.ValidationStatus = {}));
function toValidationStatus(protoStatus) {
    switch (protoStatus) {
        case ValidationStatus.UNSPECIFIED:
            return exports.ValidationStatus.Unspecified;
        case ValidationStatus.PENDING:
            return exports.ValidationStatus.Pending;
        case ValidationStatus.APPROVED:
            return exports.ValidationStatus.Approved;
        case ValidationStatus.REJECTED:
            return exports.ValidationStatus.Rejected;
        default:
            return exports.ValidationStatus.Unspecified;
    }
}

class BrijPartnerClient {
    authKeyPair;
    storageBaseUrl;
    orderBaseUrl;
    _authPublicKey;
    _storageClient;
    _orderClient;
    _verifierAuthPk;
    constructor({ authKeyPair, appConfig = AppConfig.demo() }) {
        this.authKeyPair = authKeyPair;
        this.storageBaseUrl = appConfig.storageBaseUrl;
        this.orderBaseUrl = appConfig.orderBaseUrl;
        this._verifierAuthPk = appConfig.verifierAuthPk;
        this._authPublicKey = "";
        this._storageClient = null;
        this._orderClient = null;
    }
    static async generateKeyPair() {
        const keyPair = nacl__default.default.sign.keyPair();
        return {
            publicKey: base58__default.default.encode(keyPair.publicKey),
            privateKey: base58__default.default.encode(keyPair.secretKey),
            secretKey: base58__default.default.encode(keyPair.secretKey),
            seed: base58__default.default.encode(keyPair.secretKey.slice(0, 32)),
            getPublicKeyBytes: async () => keyPair.publicKey,
            getPrivateKeyBytes: async () => keyPair.secretKey,
        };
    }
    static async fromSeed(seed, appConfig) {
        const decoded = base58__default.default.decode(seed);
        const authKeyPair = nacl__default.default.sign.keyPair.fromSeed(decoded);
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
    async init() {
        await Promise.all([this.generateAuthToken()]);
    }
    async generateAuthToken() {
        const [publicKeyBytes, privateKeyBytes] = await Promise.all([
            this.authKeyPair.getPublicKeyBytes(),
            this.authKeyPair.getPrivateKeyBytes(),
        ]);
        this._authPublicKey = base58__default.default.encode(publicKeyBytes);
        const storageToken = await this.createToken(privateKeyBytes, "storage.brij.fi");
        const storageTransport = createTransport(this.storageBaseUrl, storageToken);
        this._storageClient = createClient(PartnerService$1, storageTransport);
        const orderToken = await this.createToken(privateKeyBytes, "orders.brij.fi");
        const orderTransport = createTransport(this.orderBaseUrl, orderToken);
        this._orderClient = createClient(PartnerService, orderTransport);
    }
    async createToken(privateKeyBytes, audience) {
        const header = { alg: "EdDSA", typ: "JWT" };
        const payload = {
            iss: this._authPublicKey,
            iat: Math.floor(Date.now() / 1000),
            aud: audience,
        };
        const encodedHeader = jose.base64url.encode(JSON.stringify(header));
        const encodedPayload = jose.base64url.encode(JSON.stringify(payload));
        const dataToSign = `${encodedHeader}.${encodedPayload}`;
        const signature = nacl__default.default.sign.detached(new TextEncoder().encode(dataToSign), privateKeyBytes);
        return `${dataToSign}.${jose.base64url.encode(signature)}`;
    }
    async getUserData({ userPK, secretKey, includeValues = true }) {
        const response = await this._storageClient.getUserData({
            userPublicKey: userPK,
            includeValues,
        });
        const validationMap = new Map(response.validationData.map((data) => [
            data.dataId,
            {
                dataId: data.dataId,
                value: data.hash,
                status: toValidationStatus(data.status),
            },
        ]));
        const userData = {};
        const secret = base58__default.default.decode(secretKey);
        const documentList = [];
        const bankInfoList = [];
        for (const encrypted of response.userData) {
            const decryptedData = encrypted.encryptedValue && encrypted.encryptedValue.length > 0
                ? await this.decryptData(encrypted.encryptedValue, secret)
                : new Uint8Array(0);
            const dataId = encrypted.id;
            const verificationData = validationMap.get(dataId);
            const commonFields = {
                dataId,
                hash: encrypted.hash
            };
            switch (encrypted.type) {
                case DataType.EMAIL: {
                    const data = protobuf__namespace.fromBinary(EmailSchema, decryptedData);
                    userData.email = {
                        value: data.value,
                        ...commonFields,
                        ...commonFields,
                        status: verificationData?.status ?? exports.ValidationStatus.Unspecified
                    };
                    break;
                }
                case DataType.PHONE: {
                    const data = protobuf__namespace.fromBinary(PhoneSchema, decryptedData);
                    userData.phone = {
                        value: data.value,
                        ...commonFields,
                        status: verificationData?.status ?? exports.ValidationStatus.Unspecified
                    };
                    break;
                }
                case DataType.NAME: {
                    const data = protobuf__namespace.fromBinary(NameSchema, decryptedData);
                    userData.name = {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        ...commonFields,
                    };
                    break;
                }
                case DataType.CITIZENSHIP: {
                    const data = protobuf__namespace.fromBinary(CitizenshipSchema, decryptedData);
                    userData.citizenship = {
                        value: data.value,
                        ...commonFields
                    };
                    break;
                }
                case DataType.BIRTH_DATE: {
                    const data = protobuf__namespace.fromBinary(BirthDateSchema, decryptedData);
                    userData.birthDate = {
                        value: data.value ? new Date(Number(data.value.seconds) * 1000 + Number(data.value.nanos) / 1_000_000) : new Date(),
                        ...commonFields
                    };
                    break;
                }
                case DataType.DOCUMENT: {
                    const data = protobuf__namespace.fromBinary(DocumentSchema, decryptedData);
                    documentList.push({
                        type: data.type,
                        number: data.number,
                        countryCode: data.countryCode,
                        ...commonFields,
                    });
                    break;
                }
                case DataType.BANK_INFO: {
                    const data = protobuf__namespace.fromBinary(BankInfoSchema, decryptedData);
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
                    const data = protobuf__namespace.fromBinary(SelfieImageSchema, decryptedData);
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
    async decryptOrderFields(order, secretKey) {
        const decryptField = async (field) => {
            if (!field)
                return "";
            try {
                const encryptedData = naclUtil__default.default.decodeBase64(field);
                return new TextDecoder().decode(await this.decryptData(encryptedData, secretKey));
            }
            catch {
                return field;
            }
        };
        return {
            ...order,
            bankAccount: await decryptField(order.bankAccount),
            bankName: await decryptField(order.bankName),
        };
    }
    async processOrder(order, secretKey) {
        const decryptedOrder = await this.decryptOrderFields(order, secretKey);
        if (order.userSignature) {
            const userVerifyKey = base58__default.default.decode(order.userPublicKey);
            const userMessage = order.type === RampType.ON_RAMP
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
            const isValidUserSig = nacl__default.default.sign.detached.verify(new TextEncoder().encode(userMessage), base58__default.default.decode(order.userSignature), userVerifyKey);
            if (!isValidUserSig) {
                throw new Error("Invalid user signature");
            }
        }
        if (order.partnerSignature) {
            const partnerVerifyKey = base58__default.default.decode(order.partnerPublicKey);
            const partnerMessage = order.type === RampType.ON_RAMP
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
            const isValidPartnerSig = nacl__default.default.sign.detached.verify(new TextEncoder().encode(partnerMessage), base58__default.default.decode(order.partnerSignature), partnerVerifyKey);
            if (!isValidPartnerSig) {
                throw new Error("Invalid partner signature");
            }
        }
        return decryptedOrder;
    }
    async getOrder({ externalId, orderId }) {
        const response = await this._orderClient.getOrder({
            orderId,
            externalId,
        });
        const secretKey = await this.getUserSecretKey(response.userPublicKey);
        return this.processOrder(response, base58__default.default.decode(secretKey));
    }
    async getPartnerOrders() {
        const response = await this._orderClient.getOrders({});
        const partnerOrders = [];
        for (const order of response.orders) {
            try {
                const secretKey = await this.getUserSecretKey(order.userPublicKey);
                const processedOrder = await this.processOrder(order, base58__default.default.decode(secretKey));
                partnerOrders.push(processedOrder);
            }
            catch {
                continue;
            }
        }
        return partnerOrders;
    }
    async acceptOnRampOrder({ orderId, bankName, bankAccount, externalId, userSecretKey, }) {
        const key = base58__default.default.decode(userSecretKey);
        const order = await this.getOrder({ orderId });
        const encryptField = (value) => {
            const nonce = nacl__default.default.randomBytes(nacl__default.default.secretbox.nonceLength);
            const ciphertext = nacl__default.default.secretbox(naclUtil__default.default.decodeUTF8(value), nonce, key);
            return naclUtil__default.default.encodeBase64(new Uint8Array([...nonce, ...ciphertext]));
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
        const signature = nacl__default.default.sign.detached(new TextEncoder().encode(signatureMessage), privateKeyBytes);
        await this._orderClient.acceptOrder({
            orderId,
            bankName: encryptedBankName,
            bankAccount: encryptedBankAccount,
            externalId,
            partnerSignature: base58__default.default.encode(signature),
        });
    }
    async acceptOffRampOrder({ orderId, cryptoWalletAddress, externalId }) {
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
        const signature = nacl__default.default.sign.detached(new TextEncoder().encode(signatureMessage), privateKeyBytes);
        await this._orderClient.acceptOrder({
            orderId,
            cryptoWalletAddress,
            externalId,
            partnerSignature: base58__default.default.encode(signature),
        });
    }
    async completeOnRampOrder({ orderId, transactionId, externalId }) {
        await this._orderClient.completeOrder({
            orderId: orderId,
            transactionId: transactionId,
            externalId: externalId,
        });
    }
    async completeOffRampOrder({ orderId, externalId }) {
        await this._orderClient.completeOrder({
            orderId: orderId,
            externalId: externalId,
        });
    }
    async failOrder({ orderId, reason, externalId }) {
        await this._orderClient.failOrder({
            orderId: orderId,
            reason: reason,
            externalId: externalId,
        });
    }
    async rejectOrder({ orderId, reason }) {
        await this._orderClient.rejectOrder({
            orderId: orderId,
            reason: reason,
        });
    }
    async updateFees(params) {
        await this._orderClient.updateFees(params);
    }
    async getUserInfo(publicKey) {
        const response = await this._storageClient.getInfo({
            publicKey: publicKey,
        });
        return response;
    }
    async getUserSecretKey(publicKey) {
        const info = await this.getUserInfo(publicKey);
        const encryptedData = naclUtil__default.default.decodeBase64(info.encryptedSecretKey);
        const privateKeyBytes = await this.authKeyPair.getPrivateKeyBytes();
        const x25519PrivateKey = ed2curve__default.default.convertSecretKey(privateKeyBytes);
        const userPk = base58__default.default.decode(publicKey);
        const x25519PublicKey = ed2curve__default.default.convertPublicKey(userPk);
        const nonce = encryptedData.slice(0, nacl__default.default.box.nonceLength);
        const ciphertext = encryptedData.slice(nacl__default.default.box.nonceLength);
        const decryptedSecretKey = nacl__default.default.box.open(ciphertext, nonce, x25519PublicKey, x25519PrivateKey);
        if (!decryptedSecretKey) {
            throw new Error("Decryption failed");
        }
        return base58__default.default.encode(decryptedSecretKey);
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
    async decryptData(encryptedMessage, key) {
        if (encryptedMessage.length < nacl__default.default.secretbox.nonceLength) {
            throw new Error(`Encrypted message too short: ${encryptedMessage.length} bytes`);
        }
        const nonce = encryptedMessage.slice(0, nacl__default.default.secretbox.nonceLength);
        const ciphertext = encryptedMessage.slice(nacl__default.default.secretbox.nonceLength);
        const decrypted = nacl__default.default.secretbox.open(ciphertext, nonce, key);
        if (!decrypted) {
            throw new Error("Unable to decrypt data");
        }
        return decrypted;
    }
    createUserOnRampMessage({ orderId, cryptoAmount, cryptoCurrency, fiatAmount, fiatCurrency, cryptoWalletAddress, }) {
        const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
        const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
        return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${cryptoWalletAddress}`;
    }
    createUserOffRampMessage({ orderId, cryptoAmount, cryptoCurrency, fiatAmount, fiatCurrency, encryptedBankName, encryptedBankAccount, cryptoWalletAddress, }) {
        const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
        const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
        return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${encryptedBankName}|${encryptedBankAccount}|${cryptoWalletAddress}`;
    }
    createPartnerOnRampMessage({ orderId, cryptoAmount, cryptoCurrency, fiatAmount, fiatCurrency, encryptedBankName, encryptedBankAccount, }) {
        const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
        const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
        return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${encryptedBankName}|${encryptedBankAccount}`;
    }
    createPartnerOffRampMessage({ orderId, cryptoAmount, cryptoCurrency, fiatAmount, fiatCurrency, cryptoWalletAddress, }) {
        const decimalCryptoAmount = convertToDecimalPrecision(cryptoAmount, cryptoCurrency);
        const decimalFiatAmount = convertToDecimalPrecision(fiatAmount, fiatCurrency);
        return `${orderId}|${decimalCryptoAmount}|${cryptoCurrency}|${decimalFiatAmount}|${fiatCurrency}|${cryptoWalletAddress}`;
    }
}

exports.AppConfig = AppConfig;
exports.BrijPartnerClient = BrijPartnerClient;
exports.toValidationStatus = toValidationStatus;
//# sourceMappingURL=index.cjs.map

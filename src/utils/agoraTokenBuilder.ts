import pako from 'pako';
import CryptoJS from 'crypto-js';

function packUint16LE(val: number): string {
  return String.fromCharCode(val & 0xff, (val >> 8) & 0xff);
}

function packUint32LE(val: number): string {
  return String.fromCharCode(
    val & 0xff,
    (val >> 8) & 0xff,
    (val >> 16) & 0xff,
    (val >> 24) & 0xff
  );
}

function packString(str: string): string {
  const encoded = unescape(encodeURIComponent(str));
  return packUint16LE(encoded.length) + encoded;
}

function packMapUint32(map: Record<number, number>): string {
  const keys = Object.keys(map).map(Number);
  let res = packUint16LE(keys.length);
  for (const k of keys) {
    res += packUint16LE(k) + packUint32LE(map[k]);
  }
  return res;
}

function latin1ToBase64(str: string): string {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Latin1.parse(str));
}

/**
 * Official Agora AccessToken2 (007) Binary & Zlib-Deflated Encoder
 * Pure JavaScript implementation for React Native / Expo (No Node 'crypto' or 'zlib' dependencies)
 */
export function generateAgoraToken007(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number = 0,
  expireSeconds: number = 86400
): string {
  if (!appId || !appCertificate) return '';

  try {
    const issueTs = Math.floor(Date.now() / 1000);
    const expireTs = issueTs + expireSeconds;
    const salt = Math.floor(Math.random() * 99999999);

    // Signing key = HMAC-SHA256(issueTs (4B LE), appCertificate)
    const issueTsBin = packUint32LE(issueTs);
    const keyWordArray = CryptoJS.enc.Utf8.parse(appCertificate);
    const signingKeyWordArray = CryptoJS.HmacSHA256(CryptoJS.enc.Latin1.parse(issueTsBin), keyWordArray);

    // RTC Service Privileges: 1=JoinChannel, 2=PublishAudio, 3=PublishVideo, 4=PublishData
    const privileges: Record<number, number> = {
      1: expireTs,
      2: expireTs,
      3: expireTs,
      4: expireTs,
    };
    const uidStr = uid === 0 ? '' : String(uid);

    const serviceData = packString(channelName) + packString(uidStr) + packMapUint32(privileges);
    const serviceBlock = packUint16LE(1) + packUint16LE(serviceData.length) + serviceData;
    const servicesBlock = packUint16LE(1) + serviceBlock;

    const signingInfo = packString(appId) + packUint32LE(issueTs) + packUint32LE(expireTs) + packUint32LE(salt) + servicesBlock;
    const signatureWordArray = CryptoJS.HmacSHA256(CryptoJS.enc.Latin1.parse(signingInfo), signingKeyWordArray);
    const signatureBin = CryptoJS.enc.Latin1.stringify(signatureWordArray);

    const contentBin = packString(signatureBin) + signingInfo;

    // Convert binary string to Uint8Array for pako zlib deflate
    const bytes = new Uint8Array(contentBin.length);
    for (let i = 0; i < contentBin.length; i++) {
      bytes[i] = contentBin.charCodeAt(i) & 0xff;
    }

    const compressedBytes = pako.deflate(bytes);

    // Convert compressed Uint8Array to latin1 string for Base64 encoding
    let compressedBin = '';
    for (let i = 0; i < compressedBytes.length; i++) {
      compressedBin += String.fromCharCode(compressedBytes[i]);
    }

    return `007${latin1ToBase64(compressedBin)}`;
  } catch (e) {
    console.warn('[generateAgoraToken007] Error generating token:', e);
    return '';
  }
}

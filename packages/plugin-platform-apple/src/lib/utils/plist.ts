import fs from 'node:fs';
import { RnefError } from '@rnef/tools';
import type { PlistObject, PlistValue } from 'plist';
import plist from 'plist';

export function readPlistFile(path: string) {
  const plistContent = fs.readFileSync(path, 'utf8');
  return plist.parse(plistContent);
}

export function writePlistFile(path: string, value: PlistValue) {
  const plistContent = plist.build(value);
  fs.writeFileSync(path, plistContent);
}

export function readPlistStringFromFile(plistPath: string, key: string) {
  const plist = readPlistFile(plistPath);
  return getStringValue(plist, key);
}

export function getPlistObjectValue(plist: PlistValue, key: string) {
  ensureObject(plist);
  const value = plist[key];
  ensureObject(value);
  return value;
}

export function getStringValue(plist: PlistValue, key: string) {
  ensureObject(plist);

  const value = plist[key];
  ensureString(value);

  return value;
}

export function ensureString(value: PlistValue): asserts value is string {
  if (typeof value !== 'string') {
    throw new RnefError(`PList: expected string value: ${value}`);
  }
}

export function ensureObject(value: PlistValue): asserts value is PlistObject {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Buffer ||
    value instanceof Date
  ) {
    throw new RnefError(`PList: expected object value: ${value}`);
  }
}

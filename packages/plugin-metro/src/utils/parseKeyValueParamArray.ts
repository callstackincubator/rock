/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export default function parseKeyValueParamArray(
  paramArray: Array<string>
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const param of paramArray) {
    const equalIndex = param.indexOf('=');
    if (equalIndex === -1) {
      throw new Error(`Invalid key-value param: ${param}. Expected format: key=value`);
    }
    
    const key = decodeURIComponent(param.slice(0, equalIndex));
    const value = decodeURIComponent(param.slice(equalIndex + 1));
    
    result[key] = value;
  }
  
  return result;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';
import type { PackagerAsset } from './assetPathUtils.js';
import assetPathUtils from './assetPathUtils.js';

function getAssetDestPathAndroid(asset: PackagerAsset, scale: number): string {
  const androidFolder = assetPathUtils.getAndroidResourceFolderName(
    asset,
    scale
  );
  const fileName = assetPathUtils.getResourceIdentifier(asset);
  return path.join(androidFolder, `${fileName}.${asset.type}`);
}

export default getAssetDestPathAndroid;
import path from 'node:path';
import { getDotRnefPath } from '@rnef/tools';

export function getSignOutputPath(platformName: string) {
  return path.join(getDotRnefPath(), platformName, 'sign', 'output');
}

// /**
//  * Unpack IPA file contents to given path.
//  * @param ipaPath - Path to the IPA file.
//  * @param destination - Path to the destination folder.
//  * @returns Path to .app directory (package) inside the IPA file.
//  */
// export const unpackIpa = (ipaPath: string, destination: string): string => {
//   if (existsSync(destination)) {
//     rmSync(destination, { recursive: true, force: true });
//   }

//   mkdirSync(destination, { recursive: true });

//   const zip = new AdmZip(ipaPath);
//   zip.extractAllTo(destination, true);

//   const payloadPath = `${destination}/Payload`;
//   if (!existsSync(payloadPath)) {
//     throw new Error('Payload folder not found in the extracted IPA file');
//   }

//   const appPath = findDirectoriesWithPattern(payloadPath, /\.app$/)[0];
//   if (!appPath) {
//     throw new RnefError(
//       `.app package not found in the extracted IPA file ${payloadPath}`
//     );
//   }

//   return appPath;
// };

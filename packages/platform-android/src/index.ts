export * from './lib/platformAndroid.js';
export {
  type PackageAarFlags,
  packageAar,
  options as packageAarOptions,
} from './lib/commands/aar/packageAar.js';
export {
  type PublishLocalAarFlags,
  publishLocalAar,
  options as publishLocalAarOptions,
} from './lib/commands/aar/publishLocalAar.js';

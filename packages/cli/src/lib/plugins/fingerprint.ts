import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { PluginApi } from '@rnef/config';
import type { FingerprintSources } from '@rnef/tools';
import {
  color,
  intro,
  isInteractive,
  logger,
  nativeFingerprint,
  outro,
  RnefError,
  spinner,
} from '@rnef/tools';

type NativeFingerprintCommandOptions = {
  platform: 'ios' | 'android';
  raw?: boolean;
};

type EnvFingerprintSource = {
  type: 'env';
  name: string;
  value: string | undefined;
  hash: string | null;
};

type EnvConfig = {
  common?: string[];
  ios?: string[];
  android?: string[];
};

const DEFAULT_ENV_VARS: EnvConfig = {
  ios: [
    'RCT_NEW_ARCH_ENABLED',
    'USE_HERMES',
    'USE_FRAMEWORKS',
    'RCT_ENABLE_PREBUILD',
  ],
  android: [
    'ORG_GRADLE_PROJECT_newArchEnabled',
    'ORG_GRADLE_PROJECT_hermesEnabled',
    'REACT_NATIVE_OVERRIDE_VERSION',
  ],
  common: [
    'NODE_ENV',
    'CI',
  ],
};

function loadEnvFiles(projectRoot: string): void {
  const envFiles = [
    '.env',
    '.env.local',
    `.env.${process.env['NODE_ENV']}`,
    `.env.${process.env['NODE_ENV']}.local`,
  ].filter(Boolean);

  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envVars = parseEnvFile(envContent);
        
        for (const [key, value] of Object.entries(envVars)) {
          if (process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
        
        logger.debug(`Loaded env file: ${envFile}`);
      } catch (error) {
        logger.debug(`Failed to load env file ${envFile}:`, error);
      }
    }
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        const cleanValue = value.replace(/^["']|["']$/g, '');
        envVars[key.trim()] = cleanValue;
      }
    }
  }
  
  return envVars;
}

function getEnvVariableHash(envVar: string): string | null {
  const value = process.env[envVar];
  if (value === undefined) {
    return null;
  }
  return createHash('sha256').update(`${envVar}=${value}`).digest('hex');
}

function getEnvSources(envVars: string[]): EnvFingerprintSource[] {
  return envVars.map((envVar) => ({
    type: 'env' as const,
    name: envVar,
    value: process.env[envVar],
    hash: getEnvVariableHash(envVar),
  }));
}

function combineFingerprints(
  nativeHash: string,
  envSources: EnvFingerprintSource[],
): string {
  const validEnvHashes = envSources
    .filter((source) => source.hash !== null)
    .map((source) => source.hash);
  
  if (validEnvHashes.length === 0) {
    return nativeHash;
  }
  
  const combinedInput = [nativeHash, ...validEnvHashes].join(':');
  return createHash('sha256').update(combinedInput).digest('hex');
}

function getEnvVarsForPlatform(platform: 'ios' | 'android'): string[] {
  const platformVars = DEFAULT_ENV_VARS[platform] || [];
  const commonVars = DEFAULT_ENV_VARS.common || [];
  return [...commonVars, ...platformVars];
}

function extractEnvFromConfig(
  fingerprintOptions: FingerprintSources & { env?: EnvConfig },
  platform: 'ios' | 'android'
): string[] {
  if (!fingerprintOptions?.env) {
    return getEnvVarsForPlatform(platform);
  }
  
  const commonVars = fingerprintOptions.env.common || [];
  const platformVars = fingerprintOptions.env[platform] || [];
  
  const uniqueVars = new Set([...commonVars, ...platformVars]);
  return Array.from(uniqueVars);
}

export async function nativeFingerprintCommand(
  path: string,
  fingerprintOptions: FingerprintSources & { env?: EnvConfig },
  options: NativeFingerprintCommandOptions,
) {
  validateOptions(options);
  const platform = options.platform;
  const readablePlatformName = platform === 'ios' ? 'iOS' : 'Android';
  
  loadEnvFiles(path);
  
  const envVars = extractEnvFromConfig(fingerprintOptions, platform);
  const envSources = getEnvSources(envVars);

  if (options.raw || !isInteractive()) {
    const fingerprint = await nativeFingerprint(path, {
      platform,
      extraSources: fingerprintOptions.extraSources,
      ignorePaths: fingerprintOptions.ignorePaths,
    });
    
    const finalHash = combineFingerprints(fingerprint.hash, envSources);
    console.log(finalHash);
    
    console.error(
      JSON.stringify(
        {
          hash: finalHash,
          sources: [
            ...fingerprint.sources.filter((source) => source.hash != null),
            ...envSources.filter((source) => source.hash != null),
          ],
        },
        null,
        2,
      ),
    );
    return;
  }

  intro(`${readablePlatformName} Fingerprint`);

  const loader = spinner();
  loader.start("Calculating fingerprint for the project's native parts");

  const start = performance.now();
  const fingerprint = await nativeFingerprint(path, {
    platform,
    extraSources: fingerprintOptions.extraSources,
    ignorePaths: fingerprintOptions.ignorePaths,
  });
  
  const finalHash = combineFingerprints(fingerprint.hash, envSources);
  const duration = performance.now() - start;

  loader.stop(
    `Fingerprint calculated: ${color.bold(color.magenta(finalHash))}`,
  );

  const activeEnvSources = envSources.filter((source) => source.hash !== null);
  if (activeEnvSources.length > 0) {
    logger.log(`Environment variables included in fingerprint:`);
    activeEnvSources.forEach((source) => {
      logger.log(
        `  ${color.cyan(source.name)}: ${color.green('[SET]')}`,
      );
    });
  }

  const inactiveEnvSources = envSources.filter((source) => source.hash === null);
  if (inactiveEnvSources.length > 0) {
    logger.debug(`Environment variables not set:`);
    inactiveEnvSources.forEach((source) => {
      logger.debug(`  ${color.gray(source.name)}: [NOT SET]`);
    });
  }

  logger.debug(
    'Sources:',
    JSON.stringify(
      [
        ...fingerprint.sources.filter((source) => source.hash != null),
        ...envSources.filter((source) => source.hash != null),
      ],
      null,
      2,
    ),
  );
  logger.debug(`Duration: ${(duration / 1000).toFixed(1)}s`);

  outro('Success 🎉');
}

function validateOptions(options: NativeFingerprintCommandOptions) {
  if (!options.platform) {
    throw new RnefError(
      'The --platform flag is required. Please specify either "ios" or "android".',
    );
  }
  if (options.platform !== 'ios' && options.platform !== 'android') {
    throw new RnefError(
      `Unsupported platform "${options.platform}". Please specify either "ios" or "android".`,
    );
  }
}

export const fingerprintPlugin = () => (api: PluginApi) => {
  api.registerCommand({
    name: 'fingerprint',
    description: 'Calculate fingerprint for given platform',
    action: async (path, options) => {
      const fingerprintOptions = api.getFingerprintOptions();
      const dir = path || api.getProjectRoot();
      await nativeFingerprintCommand(dir, fingerprintOptions, options);
    },
    options: [
      {
        name: '-p, --platform <string>',
        description: 'Select platform, e.g. ios or android',
      },
      {
        name: '--raw',
        description: 'Output the raw fingerprint hash for piping',
      },
    ],
    args: [
      { name: '[path]', description: 'Directory to calculate fingerprint for' },
    ],
  });

  return {
    name: 'internal_fingerprint',
    description: 'Fingerprint plugin',
  };
};
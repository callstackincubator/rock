import fs, { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { color, logger } from '@rock-js/tools';
import { runXcodebuild } from './runXcodebuild.js';

interface MergeFrameworksOptions {
  frameworkPaths: string[];
  outputPath: string;
  sourceDir: string;
}

interface NormalizedFrameworkInput {
  frameworkPath: string;
  cleanupPath?: string;
}

function resolveFrameworkName(frameworkPath: string) {
  return path.basename(frameworkPath, '.framework');
}

function createFrameworkInfoPlist(
  frameworkName: string,
  bundleIdentifier: string,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${frameworkName}</string>
  <key>CFBundleIdentifier</key>
  <string>${bundleIdentifier}</string>
  <key>CFBundleName</key>
  <string>${frameworkName}</string>
  <key>CFBundlePackageType</key>
  <string>FMWK</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
</dict>
</plist>
`;
}

function createFrameworkModuleMap({
  frameworkName,
  umbrellaHeaderName,
  swiftHeaderName,
}: {
  frameworkName: string;
  umbrellaHeaderName: string;
  swiftHeaderName?: string;
}) {
  const swiftModuleBlock = swiftHeaderName
    ? `

module ${frameworkName}.Swift {
  header "../Headers/${swiftHeaderName}"
  requires objc
}
`
    : '';
  return `framework module ${frameworkName} {
  umbrella header "../Headers/${umbrellaHeaderName}"

  export *
  module * { export * }
}${swiftModuleBlock}
`;
}

function ensureDirectory(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyFileIfExists(sourcePath: string, destinationPath: string) {
  if (!existsSync(sourcePath)) {
    return;
  }

  ensureDirectory(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectoryIfExists(sourcePath: string, destinationPath: string) {
  if (!existsSync(sourcePath)) {
    return;
  }

  ensureDirectory(path.dirname(destinationPath));
  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

function copyDirectoryContentsIfExists(
  sourcePath: string,
  destinationPath: string,
) {
  if (!existsSync(sourcePath)) {
    return;
  }

  ensureDirectory(destinationPath);

  for (const entry of fs.readdirSync(sourcePath)) {
    fs.cpSync(path.join(sourcePath, entry), path.join(destinationPath, entry), {
      recursive: true,
      force: true,
    });
  }
}

function createGeneratedUmbrellaHeader({
  frameworkName,
  headerNames,
}: {
  frameworkName: string;
  headerNames: string[];
}) {
  const imports = headerNames
    .filter((headerName) => headerName !== `${frameworkName}-Swift.h`)
    .map((headerName) => `#import "${headerName}"`)
    .join('\n');

  return `${imports}${imports ? '\n\n' : ''}FOUNDATION_EXPORT double ${frameworkName}VersionNumber;
FOUNDATION_EXPORT const unsigned char ${frameworkName}VersionString[];
`;
}

function getFrameworkHeaderImports(
  umbrellaHeaderPath: string,
  frameworkName: string,
) {
  if (!existsSync(umbrellaHeaderPath)) {
    return [];
  }

  const umbrellaHeaderContents = fs.readFileSync(umbrellaHeaderPath, 'utf8');
  const imports: string[] = [];
  const importPattern = /^\s*#import\s+(?:"([^"]+)"|<([^>]+)>)/gm;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(umbrellaHeaderContents)) !== null) {
    const quotedImport = match[1];
    const angledImport = match[2];

    if (quotedImport) {
      imports.push(path.basename(quotedImport));
      continue;
    }

    if (!angledImport) {
      continue;
    }

    const [moduleName, headerName] = angledImport.split('/');

    if (moduleName === frameworkName && headerName) {
      imports.push(path.basename(headerName));
    }
  }

  return imports;
}

function collectFoundationExports(umbrellaHeader: string) {
  return (
    umbrellaHeader.match(/^\s*FOUNDATION_EXPORT\b.*$/gm)?.map((line) =>
      line.trim(),
    ) ?? []
  );
}

function renderSanitizedUmbrellaHeader({
  frameworkName,
  headerNames,
  foundationExports,
}: {
  frameworkName: string;
  headerNames: string[];
  foundationExports: string[];
}) {
  const imports = headerNames
    .map((headerName) => `#import "${headerName}"`)
    .join('\n');
  const foundationExportPrelude = `#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif`;
  const exports =
    foundationExports.length > 0
      ? foundationExports.join('\n')
      : `FOUNDATION_EXPORT double ${frameworkName}VersionNumber;\nFOUNDATION_EXPORT const unsigned char ${frameworkName}VersionString[];`;

  return `${imports}${imports ? '\n\n' : ''}${foundationExportPrelude}\n\n${exports}\n`;
}

function sanitizeUmbrellaHeader({
  frameworkName,
  headersDir,
  umbrellaHeaderName,
}: {
  frameworkName: string;
  headersDir: string;
  umbrellaHeaderName: string;
}) {
  const umbrellaHeaderPath = path.join(headersDir, umbrellaHeaderName);

  if (!existsSync(umbrellaHeaderPath)) {
    return;
  }

  const umbrellaHeader = fs.readFileSync(umbrellaHeaderPath, 'utf8');
  const localImports = getFrameworkHeaderImports(
    umbrellaHeaderPath,
    frameworkName,
  );

  if (localImports.length === 0) {
    return;
  }

  const availableImports = localImports.filter((headerName) =>
    existsSync(path.join(headersDir, headerName)),
  );

  if (availableImports.length === localImports.length) {
    return;
  }

  fs.writeFileSync(
    umbrellaHeaderPath,
    renderSanitizedUmbrellaHeader({
      frameworkName,
      headerNames: availableImports,
      foundationExports: collectFoundationExports(umbrellaHeader),
    }),
    'utf8',
  );
}

function getHeaderSearchRoots(sourceDir: string) {
  const absoluteSourceDir = path.resolve(sourceDir);
  const searchRoots: string[] = [];
  let currentDir = absoluteSourceDir;

  while (currentDir && !searchRoots.includes(currentDir)) {
    searchRoots.push(currentDir);
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  currentDir = path.resolve(process.cwd());
  while (currentDir && !searchRoots.includes(currentDir)) {
    searchRoots.push(currentDir);
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return searchRoots.flatMap((searchRoot) => {
    const nestedRoots = [searchRoot];

    for (const childDirName of ['packages', 'apps']) {
      const nestedRoot = path.join(searchRoot, childDirName);
      if (existsSync(nestedRoot)) {
        nestedRoots.push(nestedRoot);
      }
    }

    return nestedRoots;
  });
}

function shouldSkipDirectoryEntry(entryName: string) {
  return (
    entryName === '.git' ||
    entryName === 'build' ||
    entryName === 'DerivedData' ||
    entryName === 'node_modules' ||
    entryName.startsWith('.')
  );
}

function findFileInDirectoryTree(rootDir: string, fileName: string): string | undefined {
  if (!existsSync(rootDir)) {
    return undefined;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return entryPath;
    }

    if (entry.isDirectory() && !shouldSkipDirectoryEntry(entry.name)) {
      const nestedMatch = findFileInDirectoryTree(entryPath, fileName);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
  }

  return undefined;
}

function resolveMissingHeaderPath({
  buildProductPath,
  headerName,
  sourceDir,
}: {
  buildProductPath: string;
  headerName: string;
  sourceDir: string;
}) {
  const directBuildProductPath = path.join(buildProductPath, headerName);
  if (existsSync(directBuildProductPath)) {
    return directBuildProductPath;
  }

  for (const searchRoot of getHeaderSearchRoots(sourceDir)) {
    const resolvedHeaderPath = findFileInDirectoryTree(searchRoot, headerName);
    if (resolvedHeaderPath) {
      return resolvedHeaderPath;
    }
  }

  return undefined;
}

function createTemporaryFrameworkWrapper(
  missingFrameworkPath: string,
  sourceDir: string,
): NormalizedFrameworkInput {
  const frameworkName = resolveFrameworkName(missingFrameworkPath);
  const buildProductPath = path.dirname(missingFrameworkPath);
  const staticLibraryPath = path.join(buildProductPath, `lib${frameworkName}.a`);
  const umbrellaHeaderPath = path.join(
    buildProductPath,
    `${frameworkName}-umbrella.h`,
  );
  const namedModuleMapPath = path.join(
    buildProductPath,
    `${frameworkName}.modulemap`,
  );
  const swiftHeaderPath = path.join(
    buildProductPath,
    'Swift Compatibility Header',
    `${frameworkName}-Swift.h`,
  );
  const swiftModulePath = path.join(
    buildProductPath,
    `${frameworkName}.swiftmodule`,
  );
  const publicHeadersPath = path.join(buildProductPath, 'Headers');

  if (!existsSync(staticLibraryPath)) {
    throw new Error(
      `Could not resolve framework input for ${frameworkName}: neither ${missingFrameworkPath} nor ${staticLibraryPath} exists`,
    );
  }

  if (!existsSync(umbrellaHeaderPath)) {
    throw new Error(
      `Could not synthesize framework wrapper for ${frameworkName}: missing umbrella header at ${umbrellaHeaderPath}`,
    );
  }

  const frameworkTempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${frameworkName.toLowerCase()}-framework-`),
  );
  const frameworkDir = path.join(frameworkTempDir, `${frameworkName}.framework`);
  const headersDir = path.join(frameworkDir, 'Headers');
  const modulesDir = path.join(frameworkDir, 'Modules');

  ensureDirectory(headersDir);
  ensureDirectory(modulesDir);

  fs.copyFileSync(staticLibraryPath, path.join(frameworkDir, frameworkName));

  const copiedHeaderNames: string[] = [];
  const copiedHeaders = new Set<string>();
  const copyHeaderIfPresent = (
    sourcePath: string,
    destinationName = path.basename(sourcePath),
  ) => {
    if (!existsSync(sourcePath) || copiedHeaders.has(destinationName)) {
      return;
    }

    copyFileIfExists(sourcePath, path.join(headersDir, destinationName));
    copiedHeaders.add(destinationName);
    copiedHeaderNames.push(destinationName);
  };

  if (existsSync(buildProductPath)) {
    for (const entry of fs.readdirSync(buildProductPath, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.h')) {
        copyHeaderIfPresent(path.join(buildProductPath, entry.name), entry.name);
      }
    }
  }

  copyDirectoryContentsIfExists(publicHeadersPath, headersDir);
  if (existsSync(publicHeadersPath)) {
    for (const entry of fs.readdirSync(publicHeadersPath, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.h')) {
        copiedHeaders.add(entry.name);
        copiedHeaderNames.push(entry.name);
      }
    }
  }
  copyHeaderIfPresent(umbrellaHeaderPath, `${frameworkName}-umbrella.h`);
  copyHeaderIfPresent(namedModuleMapPath, `${frameworkName}.modulemap`);
  copyHeaderIfPresent(swiftHeaderPath, `${frameworkName}-Swift.h`);
  for (const importedHeaderName of getFrameworkHeaderImports(
    umbrellaHeaderPath,
    frameworkName,
  )) {
    if (copiedHeaders.has(importedHeaderName)) {
      continue;
    }

    const resolvedHeaderPath = resolveMissingHeaderPath({
      buildProductPath,
      headerName: importedHeaderName,
      sourceDir,
    });

    if (resolvedHeaderPath) {
      copyHeaderIfPresent(resolvedHeaderPath, importedHeaderName);
    } else {
      logger.warn(
        `Could not resolve public header ${importedHeaderName} while synthesizing ${frameworkName}.framework`,
      );
    }
  }
  copyDirectoryIfExists(
    swiftModulePath,
    path.join(modulesDir, `${frameworkName}.swiftmodule`),
  );

  let umbrellaHeaderName = `${frameworkName}-umbrella.h`;
  if (!copiedHeaders.has(umbrellaHeaderName)) {
    umbrellaHeaderName = `${frameworkName}-generated-umbrella.h`;
    fs.writeFileSync(
      path.join(headersDir, umbrellaHeaderName),
      createGeneratedUmbrellaHeader({
        frameworkName,
        headerNames: copiedHeaderNames,
      }),
      'utf8',
    );
  } else {
    sanitizeUmbrellaHeader({
      frameworkName,
      headersDir,
      umbrellaHeaderName,
    });
  }

  const swiftHeaderName = copiedHeaders.has(`${frameworkName}-Swift.h`)
    ? `${frameworkName}-Swift.h`
    : undefined;

  fs.writeFileSync(
    path.join(modulesDir, 'module.modulemap'),
    createFrameworkModuleMap({
      frameworkName,
      umbrellaHeaderName,
      swiftHeaderName,
    }),
    'utf8',
  );
  fs.writeFileSync(
    path.join(frameworkDir, 'Info.plist'),
    createFrameworkInfoPlist(
      frameworkName,
      `dev.rockjs.synthetic.${frameworkName.toLowerCase()}`,
    ),
    'utf8',
  );

  return {
    frameworkPath: frameworkDir,
    cleanupPath: frameworkTempDir,
  };
}

function normalizeFrameworkInput(
  frameworkPath: string,
  sourceDir: string,
): NormalizedFrameworkInput {
  if (existsSync(frameworkPath)) {
    return { frameworkPath };
  }

  return createTemporaryFrameworkWrapper(frameworkPath, sourceDir);
}

function getSwiftModuleDirectory(frameworkPath: string) {
  const frameworkName = resolveFrameworkName(frameworkPath);
  const frameworkSwiftModuleDir = path.join(
    frameworkPath,
    'Modules',
    `${frameworkName}.swiftmodule`,
  );
  if (existsSync(frameworkSwiftModuleDir)) {
    return frameworkSwiftModuleDir;
  }

  const buildProductSwiftModuleDir = path.join(
    path.dirname(frameworkPath),
    `${frameworkName}.swiftmodule`,
  );
  if (existsSync(buildProductSwiftModuleDir)) {
    return buildProductSwiftModuleDir;
  }

  return undefined;
}

function copyMissingSwiftmoduleBinaries({
  inputFrameworkPath,
  outputPath,
}: {
  inputFrameworkPath: string;
  outputPath: string;
}) {
  const frameworkName = resolveFrameworkName(inputFrameworkPath);
  const inputSwiftModuleDir = getSwiftModuleDirectory(inputFrameworkPath);

  if (!inputSwiftModuleDir) {
    return;
  }

  const outputFrameworkDirs: string[] = [];
  for (const libraryDirName of fs.readdirSync(outputPath)) {
    const candidateFrameworkDir = path.join(
      outputPath,
      libraryDirName,
      `${frameworkName}.framework`,
    );
    if (existsSync(candidateFrameworkDir)) {
      outputFrameworkDirs.push(candidateFrameworkDir);
    }
  }

  if (outputFrameworkDirs.length === 0) {
    return;
  }

  for (const entry of fs.readdirSync(inputSwiftModuleDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.swiftmodule')) {
      continue;
    }

    const sourceSwiftModulePath = path.join(inputSwiftModuleDir, entry.name);
    const swiftModuleStem = entry.name.slice(0, -'.swiftmodule'.length);

    for (const outputFrameworkDir of outputFrameworkDirs) {
      const outputSwiftModuleDir = path.join(
        outputFrameworkDir,
        'Modules',
        `${frameworkName}.swiftmodule`,
      );
      const hasMatchingInterface =
        existsSync(path.join(outputSwiftModuleDir, `${swiftModuleStem}.swiftinterface`)) ||
        existsSync(
          path.join(outputSwiftModuleDir, `${swiftModuleStem}.private.swiftinterface`),
        );

      if (!hasMatchingInterface) {
        continue;
      }

      const destinationSwiftModulePath = path.join(outputSwiftModuleDir, entry.name);
      if (!existsSync(destinationSwiftModulePath)) {
        copyFileIfExists(sourceSwiftModulePath, destinationSwiftModulePath);
      }
    }
  }
}

/**
 * Xcode emits different `.framework` file based on the destination (simulator arm64/x86_64, iphone arm64 etc.)
 * This takes those `.frameworks` files and merges them to a single `.xcframework` file for easier distribution.
 */
export async function mergeFrameworks({
  frameworkPaths,
  outputPath,
  sourceDir,
}: MergeFrameworksOptions) {
  const xcframeworkName = path.basename(outputPath);
  const normalizedFrameworkPaths = frameworkPaths.map((frameworkPath) =>
    normalizeFrameworkInput(frameworkPath, sourceDir),
  );

  if (existsSync(outputPath)) {
    logger.debug(`Removing existing merged framework output at ${outputPath}`);
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  const xcodebuildArgs = [
    '-create-xcframework',
    ...normalizedFrameworkPaths.flatMap(({ frameworkPath }) => [
      '-framework',
      frameworkPath,
    ]),
    '-output',
    outputPath,
  ];

  try {
    const { errorSummary } = await runXcodebuild(xcodebuildArgs, {
      cwd: sourceDir,
    });

    if (errorSummary) {
      throw new Error('Running xcodebuild failed', {
        cause: errorSummary,
      });
    }

    for (const { frameworkPath } of normalizedFrameworkPaths) {
      copyMissingSwiftmoduleBinaries({
        inputFrameworkPath: frameworkPath,
        outputPath,
      });
    }

    logger.success(`Created ${color.bold(xcframeworkName)}`);
  } finally {
    for (const normalizedFrameworkPath of normalizedFrameworkPaths) {
      if (normalizedFrameworkPath.cleanupPath) {
        fs.rmSync(normalizedFrameworkPath.cleanupPath, {
          recursive: true,
          force: true,
        });
      }
    }
  }
}

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

// Ensure a path exists before writing files into it.
function ensureDirectory(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

// Copy a single file, creating the destination directory first.
function copyFile(sourcePath: string, destinationPath: string) {
  ensureDirectory(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

// Copy an entire directory tree, overwriting existing content.
function copyDirectory(sourcePath: string, destinationPath: string) {
  ensureDirectory(path.dirname(destinationPath));
  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

// Generate a minimal Info.plist for a synthesized framework wrapper.
function createFrameworkInfoPlist(frameworkName: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${frameworkName}</string>
  <key>CFBundleIdentifier</key>
  <string>dev.rock.generated.${frameworkName}</string>
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

// Create a module map that exposes Objective-C and optional Swift headers.
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

// Build a fallback umbrella header when one isn't provided by Xcode.
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

// Parse the umbrella header for local header imports within the framework.
function collectLocalUmbrellaImports(
  umbrellaHeader: string,
  frameworkName: string,
) {
  const imports: string[] = [];
  const importPattern = /^\s*#import\s+(?:"([^"]+)"|<([^>]+)>)/gm;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(umbrellaHeader)) !== null) {
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

// Extract FOUNDATION_EXPORT lines to preserve version exports.
function collectFoundationExports(umbrellaHeader: string) {
  return umbrellaHeader.match(/^\s*FOUNDATION_EXPORT\b.*$/gm)?.map((line) =>
    line.trim(),
  ) ?? [];
}

// Render an umbrella header that only references headers we copied.
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

// Rewrite the umbrella header to drop missing header references.
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
  const localImports = collectLocalUmbrellaImports(umbrellaHeader, frameworkName);
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

// Derive framework name from its bundle path.
function resolveFrameworkName(frameworkPath: string) {
  return path.basename(frameworkPath, '.framework');
}

// Create a temporary .framework wrapper around a static library output.
function createFrameworkWrapper(frameworkPath: string) {
  const frameworkName = resolveFrameworkName(frameworkPath);
  const buildProductPath = path.dirname(frameworkPath);
  const staticLibraryPath = path.join(buildProductPath, `lib${frameworkName}.a`);
  if (!existsSync(staticLibraryPath)) {
    throw new Error(
      `Could not find framework or static library for ${frameworkName} at ${frameworkPath}`,
    );
  }
  const frameworkTempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${frameworkName.toLowerCase()}-framework-`),
  );
  const frameworkDir = path.join(frameworkTempDir, `${frameworkName}.framework`);
  const headersDir = path.join(frameworkDir, 'Headers');
  const modulesDir = path.join(frameworkDir, 'Modules');
  const swiftModuleSourceDir = path.join(
    buildProductPath,
    `${frameworkName}.swiftmodule`,
  );
  const swiftCompatibilityHeaderPath = path.join(
    buildProductPath,
    'Swift Compatibility Header',
    `${frameworkName}-Swift.h`,
  );
  const umbrellaHeaderPath = path.join(
    buildProductPath,
    `${frameworkName}-umbrella.h`,
  );
  const moduleMapPath = path.join(buildProductPath, `${frameworkName}.modulemap`);

  ensureDirectory(headersDir);
  ensureDirectory(modulesDir);

  copyFile(staticLibraryPath, path.join(frameworkDir, frameworkName));

  const copiedHeaderNames: string[] = [];
  const copiedHeaders = new Set<string>();
  const copyHeaderIfPresent = (
    sourcePath: string,
    destinationName = path.basename(sourcePath),
  ) => {
    if (!existsSync(sourcePath) || copiedHeaders.has(destinationName)) {
      return;
    }
    copyFile(sourcePath, path.join(headersDir, destinationName));
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

  copyHeaderIfPresent(umbrellaHeaderPath, `${frameworkName}-umbrella.h`);
  copyHeaderIfPresent(moduleMapPath, `${frameworkName}.modulemap`);
  copyHeaderIfPresent(swiftCompatibilityHeaderPath, `${frameworkName}-Swift.h`);

  if (existsSync(swiftModuleSourceDir)) {
    copyDirectory(
      swiftModuleSourceDir,
      path.join(modulesDir, `${frameworkName}.swiftmodule`),
    );
  }

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
    createFrameworkInfoPlist(frameworkName),
    'utf8',
  );

  return frameworkDir;
}

// Resolve framework input, synthesizing a wrapper when only a static lib exists.
function resolveFrameworkInputPath(
  frameworkPath: string,
  temporaryFrameworkPaths: string[],
) {
  if (existsSync(frameworkPath)) {
    return frameworkPath;
  }
  const synthesizedFrameworkPath = createFrameworkWrapper(frameworkPath);
  temporaryFrameworkPaths.push(path.dirname(synthesizedFrameworkPath));
  return synthesizedFrameworkPath;
}

/**
 * Xcode emits different `.framework` files per destination (simulator arm64/x86_64, device arm64, etc.).
 * This merges those outputs into a single `.xcframework`, synthesizing temporary wrappers when only
 * static-library build products are present.
 */
export async function mergeFrameworks({
  frameworkPaths,
  outputPath,
  sourceDir,
}: MergeFrameworksOptions) {
  const xcframeworkName = path.basename(outputPath);
  const temporaryFrameworkPaths: string[] = [];

  if (existsSync(outputPath)) {
    logger.debug(`Removing existing merged framework output at ${outputPath}`);
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  try {
    const resolvedFrameworkPaths = frameworkPaths.map((frameworkPath) =>
      resolveFrameworkInputPath(frameworkPath, temporaryFrameworkPaths),
    );
    const xcodebuildArgs = [
      '-create-xcframework',
      ...resolvedFrameworkPaths.flatMap((frameworkPath) => [
        '-framework',
        frameworkPath,
      ]),
      '-output',
      outputPath,
    ];
    const { errorSummary } = await runXcodebuild(xcodebuildArgs, {
      cwd: sourceDir,
    });
    if (errorSummary) {
      throw new Error('Running xcodebuild failed', {
        cause: errorSummary,
      });
    } else {
      logger.success(`Created ${color.bold(xcframeworkName)}`);
    }
  } finally {
    for (const temporaryFrameworkPath of temporaryFrameworkPaths) {
      fs.rmSync(temporaryFrameworkPath, { recursive: true, force: true });
    }
  }
}

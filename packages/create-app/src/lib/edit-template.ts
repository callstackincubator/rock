import * as fs from 'node:fs';
import * as path from 'node:path';

export function rewritePackageJson(projectPath: string, packageName: string) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Override fields from template
  packageJson.name = packageName;
  packageJson.version = '1.0.0';
  packageJson.private = true;

  // Remove fields from template
  delete packageJson.description;
  delete packageJson.keywords;
  delete packageJson.homepage;
  delete packageJson.bugs;
  delete packageJson.license;
  delete packageJson.author;
  delete packageJson.contributors;
  delete packageJson.funding;
  delete packageJson.repository;
  delete packageJson.packageManager;
  delete packageJson.publishConfig;

  if (packageJson.dependencies) {
    packageJson.dependencies = Object.fromEntries(
      Object.entries(packageJson.dependencies).sort()
    );
  }

  if (packageJson.devDependencies) {
    packageJson.devDependencies = Object.fromEntries(
      Object.entries(packageJson.devDependencies).sort()
    );
  }
  if (packageJson.peerDependencies) {
    packageJson.peerDependencies = Object.fromEntries(
      Object.entries(packageJson.peerDependencies).sort()
    );
  }

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(reorderFields(packageJson), null, 2)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reorderFields(packageJson: any) {
  const {
    name,
    version,
    private: privateValue,
    scripts,
    dependencies,
    devDependencies,
    peerDependencies,
    ...rest
  } = packageJson;

  const result: Record<string, unknown> = {
    name,
    version,
    private: privateValue,
    scripts,
  };

  if (dependencies) {
    result['dependencies'] = dependencies;
  }
  if (devDependencies) {
    result['devDependencies'] = devDependencies;
  }
  if (peerDependencies) {
    result['peerDependencies'] = peerDependencies;
  }

  for (const key in rest) {
    result[key] = rest[key];
  }

  return result;
}

export function renameCommonFiles(projectPath: string) {
  const sourceGitIgnorePath = path.join(projectPath, 'gitignore');
  if (!fs.existsSync(sourceGitIgnorePath)) {
    return;
  }

  fs.renameSync(sourceGitIgnorePath, path.join(projectPath, '.gitignore'));
}

const DEFAULT_PLACEHOLDER_NAME = 'HelloWorld';

export function renamePlaceholder(projectPath: string, projectName: string) {
  if (projectName === DEFAULT_PLACEHOLDER_NAME) {
    return;
  }

  for (const filePath of walkDirectory(projectPath).reverse()) {
    if (!fs.statSync(filePath).isDirectory()) {
      replaceNameInTextFile(filePath, projectName, DEFAULT_PLACEHOLDER_NAME);
    }

    if (shouldRenameFile(filePath, DEFAULT_PLACEHOLDER_NAME)) {
      renameFile(filePath, DEFAULT_PLACEHOLDER_NAME, projectName);
    } else if (
      shouldRenameFile(filePath, DEFAULT_PLACEHOLDER_NAME.toLowerCase())
    ) {
      renameFile(
        filePath,
        DEFAULT_PLACEHOLDER_NAME.toLowerCase(),
        projectName.toLowerCase()
      );
    }
  }
}

function replaceNameInTextFile(
  filePath: string,
  projectName: string,
  templateName: string
) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const replacedFileContent = fileContent
    .replace(new RegExp(templateName, 'g'), projectName)
    .replace(
      new RegExp(templateName.toLowerCase(), 'g'),
      projectName.toLowerCase()
    );

  if (fileContent !== replacedFileContent) {
    fs.writeFileSync(filePath, replacedFileContent, 'utf8');
  }
}

function shouldRenameFile(filePath: string, nameToReplace: string) {
  return path.basename(filePath).includes(nameToReplace);
}

function renameFile(filePath: string, oldName: string, newName: string) {
  const newFileName = path.join(
    path.dirname(filePath),
    path.basename(filePath).replace(new RegExp(oldName, 'g'), newName)
  );

  fs.renameSync(filePath, newFileName);
}

function walkDirectory(currentPath: string): string[] {
  if (!fs.lstatSync(currentPath).isDirectory()) {
    return [currentPath];
  }

  const childPaths = fs
    .readdirSync(currentPath)
    .flatMap((childName) => walkDirectory(path.join(currentPath, childName)));
  return [currentPath, ...childPaths];
}

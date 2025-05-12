import * as fs from 'node:fs';
import * as path from 'node:path';
import { renameFile, walkDirectory } from './fs.js';

/**
 * Placeholder name used in template, that should be replaced with project name.
 * It can contain capital and small letters, numbers and hyphen.
 */
const PLACEHOLDER_NAME = 'hello-world';
const PLACEHOLDER_PASCAL_CASE = 'HelloWorld';

/**
 * Rename common files that cannot be put into template literaly, e.g. .gitignore.
 */
export function renameCommonFiles(projectPath: string) {
  const sourceGitIgnorePath = path.join(projectPath, 'gitignore');
  if (!fs.existsSync(sourceGitIgnorePath)) {
    return;
  }

  fs.renameSync(sourceGitIgnorePath, path.join(projectPath, '.gitignore'));
}

/**
 * Replace placeholder with project nae in whole template:
 * - Rename paths containing placeholder
 * - Replace placeholder in text files
 */
export function replacePlaceholder(projectPath: string, projectName: string) {
  if (projectName === PLACEHOLDER_NAME) {
    return;
  }

  for (const filePath of walkDirectory(projectPath).reverse()) {
    if (!fs.statSync(filePath).isDirectory()) {
      replacePlaceholderInTextFile(filePath, projectName);
    }

    if (path.basename(filePath).includes(PLACEHOLDER_NAME)) {
      renameFile(filePath, PLACEHOLDER_NAME, projectName);
    } else if (path.basename(filePath).includes(PLACEHOLDER_PASCAL_CASE)) {
      renameFile(filePath, PLACEHOLDER_PASCAL_CASE, projectName);
    } else if (
      path.basename(filePath).includes(PLACEHOLDER_PASCAL_CASE.toLowerCase())
    ) {
      renameFile(
        filePath,
        PLACEHOLDER_PASCAL_CASE.toLowerCase(),
        projectName.toLowerCase()
      );
    }
  }
}

function replacePlaceholderInTextFile(filePath: string, projectName: string) {
  const pascalName = transformKebabCaseToPascalCase(projectName);

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const replacedFileContent = fileContent
    .replaceAll(PLACEHOLDER_NAME, projectName)
    .replaceAll(PLACEHOLDER_PASCAL_CASE, pascalName)
    .replaceAll(
      PLACEHOLDER_PASCAL_CASE.toLowerCase(),
      pascalName.toLowerCase()
    );

  if (fileContent !== replacedFileContent) {
    fs.writeFileSync(filePath, replacedFileContent, 'utf8');
  }
}

export function transformKebabCaseToPascalCase(kebabCase: string) {
  if (!kebabCase) return '';

  return kebabCase
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

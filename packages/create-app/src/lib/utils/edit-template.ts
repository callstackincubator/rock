import * as fs from 'node:fs';
import * as path from 'node:path';
import { renameFile, walkDirectory } from './fs.js';
import { transformProjectNameToPascalCase } from './name.js';

/**
 * Placeholder name used in template, that should be replaced with cleaned-up project name.
 */
const PLACEHOLDER_NAME = 'HelloWorld';

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
  const targetName = transformProjectNameToPascalCase(projectName);
  if (targetName === PLACEHOLDER_NAME) {
    return;
  }

  for (const filePath of walkDirectory(projectPath).reverse()) {
    if (!fs.statSync(filePath).isDirectory()) {
      replacePlaceholderInTextFile(filePath, targetName);
    }

    if (path.basename(filePath).includes(PLACEHOLDER_NAME)) {
      renameFile(filePath, PLACEHOLDER_NAME, targetName);
    } else if (
      path.basename(filePath).includes(PLACEHOLDER_NAME.toLowerCase())
    ) {
      renameFile(
        filePath,
        PLACEHOLDER_NAME.toLowerCase(),
        targetName.toLowerCase()
      );
    }
  }
}

function replacePlaceholderInTextFile(filePath: string, targetName: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const replacedFileContent = fileContent
    .replaceAll(PLACEHOLDER_NAME, targetName)
    .replaceAll(PLACEHOLDER_NAME.toLowerCase(), targetName.toLowerCase());

  if (fileContent !== replacedFileContent) {
    fs.writeFileSync(filePath, replacedFileContent, 'utf8');
  }
}

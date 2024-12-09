import * as fs from 'node:fs';
import * as path from 'node:path';
import { renameFile, walkDirectory } from './fs.js';

/**
 * Placeholder name used in template, that should be replaced with project name.
 */
const DEFAULT_PLACEHOLDER_NAME = 'HelloWorld';

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
  if (projectName === DEFAULT_PLACEHOLDER_NAME) {
    return;
  }

  for (const filePath of walkDirectory(projectPath).reverse()) {
    if (!fs.statSync(filePath).isDirectory()) {
      replacePlaceholderInTextFile(filePath, projectName);
    }

    if (path.basename(filePath).includes(DEFAULT_PLACEHOLDER_NAME)) {
      renameFile(filePath, DEFAULT_PLACEHOLDER_NAME, projectName);
    } else if (
      path.basename(filePath).includes(DEFAULT_PLACEHOLDER_NAME.toLowerCase())
    ) {
      renameFile(
        filePath,
        DEFAULT_PLACEHOLDER_NAME.toLowerCase(),
        projectName.toLowerCase()
      );
    }
  }
}

function replacePlaceholderInTextFile(filePath: string, projectName: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const replacedFileContent = fileContent
    .replace(new RegExp(DEFAULT_PLACEHOLDER_NAME, 'g'), projectName)
    .replace(
      new RegExp(DEFAULT_PLACEHOLDER_NAME.toLowerCase(), 'g'),
      projectName.toLowerCase()
    );

  if (fileContent !== replacedFileContent) {
    fs.writeFileSync(filePath, replacedFileContent, 'utf8');
  }
}

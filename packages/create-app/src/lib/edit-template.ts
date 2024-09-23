import path from 'node:path';
import fs from 'node:fs';

const DEFAULT_PLACEHOLDER_NAME = 'HelloWorld';

function replaceNameInUTF8File(
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

async function renameFile(filePath: string, oldName: string, newName: string) {
  const newFileName = path.join(
    path.dirname(filePath),
    path.basename(filePath).replace(new RegExp(oldName, 'g'), newName)
  );

  fs.renameSync(filePath, newFileName);
}

function shouldRenameFile(filePath: string, nameToReplace: string) {
  return path.basename(filePath).includes(nameToReplace);
}

function walk(current: string): string[] {
  if (!fs.lstatSync(current).isDirectory()) {
    return [current];
  }

  const files = fs
    .readdirSync(current)
    .map((child) => walk(path.join(current, child)));
  const result: string[] = [];
  return result.concat.apply([current], files);
}


export default async function changePlaceholderInTemplate(
  projectName: string,
  directory: string,
) {
  if (projectName === DEFAULT_PLACEHOLDER_NAME) {
    return;
  }

  for (const filePath of walk(directory).reverse()) {
    if (!fs.statSync(filePath).isDirectory()) {
      replaceNameInUTF8File(filePath, projectName, DEFAULT_PLACEHOLDER_NAME);
    }
    if (shouldRenameFile(filePath, DEFAULT_PLACEHOLDER_NAME)) {
      await renameFile(filePath, DEFAULT_PLACEHOLDER_NAME, projectName);
    } else if (shouldRenameFile(filePath, DEFAULT_PLACEHOLDER_NAME.toLowerCase())) {
      await renameFile(
        filePath,
        DEFAULT_PLACEHOLDER_NAME.toLowerCase(),
        projectName.toLowerCase()
      );
    }
  }
}

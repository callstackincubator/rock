import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE_PACKAGE_JSON_KEYS_FOR_REMOVAL = [
  'repository',
  'homepage',
  'bugs',
  'license',
  'author',
] as const;

/**
 * Removes keys TEMPLATE_PACKAGE_JSON_KEYS_FOR_REMOVAL from package.json generated from rock-template-default.
 * This helper is required because the metadata in template's package.json are required for OIDC publishing, but unwanted after expanding the template.
 */
export function stripTemplatePackageJsonMetadata(projectPath: string) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  for (const key of TEMPLATE_PACKAGE_JSON_KEYS_FOR_REMOVAL) {
    delete packageJson[key];
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

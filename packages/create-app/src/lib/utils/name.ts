/**
 * Transform project name to PascalCase. The input name can be in either kebab-case or PascalCase.
 *
 * @param name - Project name
 * @returns PascalCase project name
 */
export function transformProjectNameToPascalCase(name: string) {
  if (!name) return '';

  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

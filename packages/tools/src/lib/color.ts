import color from 'picocolors';

export { color };

export function colorLink(text: string) {
  return color.cyan(color.underline(color.bold(text)));
}

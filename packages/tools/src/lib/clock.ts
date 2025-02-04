import isUnicodeSupported from 'is-unicode-supported';
import { isInteractive } from './isInteractive.js';

const isUnicode = isUnicodeSupported();

export function updateClock(
  updateMessage: (text: string) => void,
  prefix: string
) {
  if (!isInteractive()) {
    return;
  }

  const origin = performance.now();
  let lastMessage = '';

  // Match @clack/prompts spinner delay
  // https://github.com/bombshell-dev/clack/blob/d4444390e80057708cd91a67db8319493839b56b/packages/prompts/src/index.ts#L680C2-L680C35
  const delay = isUnicode ? 80 : 120;

  return setInterval(() => {
    const elapsed = (performance.now() - origin) / 1000;
    if (elapsed > 5) {
      const newMessage = `${prefix} [${formatTime(elapsed)}]`;
      if (newMessage !== lastMessage) {
        updateMessage(newMessage);
        lastMessage = newMessage;
      }
    }
  }, delay);
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins >= 1) {
    return `${mins}m ${secs}s`;
  }

  return `${secs}s`;
}

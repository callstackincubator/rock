import { isInteractive } from './isInteractive.js';

export function updateClock(
  updateMessage: (text: string) => void,
  prefix: string
) {
  if (!isInteractive()) {
    return;
  }
  let seconds = 0;

  return setInterval(() => {
    const newSeconds = seconds++;
    if (seconds > 5) {
      updateMessage(`${prefix} [${formatTime(newSeconds)}]`);
    }
  }, 1000);
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 1) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

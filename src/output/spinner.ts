/**
 * Lightweight terminal spinner using only Node.js built-ins.
 * Falls back to a simple static message when stdout is not a TTY
 * (e.g. when output is piped or redirected).
 */

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

export interface Spinner {
  /** Stop the spinner and optionally replace the line with a final message. */
  stop(finalMessage?: string): void;
}

/**
 * Starts an animated spinner with the given message.
 * Returns a handle with a `stop()` method to end the animation.
 *
 * Usage:
 *   const spinner = startSpinner('Fetching profiles...');
 *   // ... await your async work ...
 *   spinner.stop();          // clears the line
 *   spinner.stop('Done!');   // replaces the line with a final message
 */
export function startSpinner(message: string): Spinner {
  const isTTY = Boolean(process.stdout.isTTY);

  if (!isTTY) {
    // Non-interactive environment — just print the message once
    process.stdout.write(`${message}\n`);
    return {
      stop(finalMessage?: string) {
        if (finalMessage) process.stdout.write(`${finalMessage}\n`);
      },
    };
  }

  let frameIndex = 0;
  let stopped = false;

  // Write the first frame immediately so there's no blank delay
  process.stdout.write(`${FRAMES[0]} ${message}`);

  const timer = setInterval(() => {
    if (stopped) return;
    frameIndex = (frameIndex + 1) % FRAMES.length;
    // Move cursor to start of line, clear it, write next frame
    process.stdout.write(`\r\x1b[K${FRAMES[frameIndex]} ${message}`);
  }, INTERVAL_MS);

  // Prevent the timer from keeping the process alive
  if (timer.unref) timer.unref();

  return {
    stop(finalMessage?: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      // Clear the spinner line
      process.stdout.write("\r\x1b[K");
      if (finalMessage) process.stdout.write(`${finalMessage}\n`);
    },
  };
}

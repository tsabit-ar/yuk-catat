/**
 * Debounce helper with explicit flush and cancel capabilities to prevent race conditions onBlur.
 */
export function createDebounced<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs !== null) {
        const currentArgs = lastArgs;
        lastArgs = null;
        fn(...currentArgs);
      }
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs !== null) {
      const currentArgs = lastArgs;
      lastArgs = null;
      fn(...currentArgs);
    }
  };

  debounced.isPending = () => timer !== null;

  return debounced;
}

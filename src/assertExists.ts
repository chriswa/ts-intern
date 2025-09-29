export function assertExists<T>(value: T, message?: string): NonNullable<T> {
  if (value === null || value === undefined) {
    // eslint-disable-next-line no-debugger
    debugger
    throw new Error(message ?? 'Expected value to be defined (non-null)')
  }
  return value
}

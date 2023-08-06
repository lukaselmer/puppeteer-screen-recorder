export interface Logger {
  log: typeof console.log
  error: typeof console.error
  warn: typeof console.warn
}

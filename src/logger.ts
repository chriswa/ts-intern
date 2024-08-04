interface BasicLogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
}

let loggerImpl: BasicLogger = console

export const logger = {
  setLogger(newLoggerImpl: BasicLogger) {
    loggerImpl = newLoggerImpl
  },
  info(msg: string) {
    loggerImpl.info(msg)
  },
  warn(msg: string) {
    loggerImpl.warn(msg)
  },
  error(msg: string) {
    loggerImpl.error(msg)
  },
}

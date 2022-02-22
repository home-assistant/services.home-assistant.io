import Toucan from "toucan-js";

export class ServiceError extends Error {
  code: number;
  errorType?: string;
  constructor(
    message: string,
    options?: { errorType?: string; code?: number }
  ) {
    super(message);
    this.name = `ServiceError - ${options?.errorType || message}`;
    this.code = options?.code || 500;
    this.errorType = options?.errorType;
  }
}

export const sentryClient = (event: FetchEvent | ScheduledEvent) => {
  const client = new Toucan({
    dsn: SENTRY_DSN,
    allowedHeaders: ["user-agent"],
    event,
    environment: WORKER_ENV,
  });
  return client;
};

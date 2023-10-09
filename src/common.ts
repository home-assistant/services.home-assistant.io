import { Toucan } from "toucan-js";

export interface CfRequest extends Request {
  cf?: IncomingRequestCfProperties;
}

export class ServiceError extends Error {
  code: number;
  errorType?: string;
  constructor(message: string, errorType?: string, code?: number) {
    super(message);
    this.name = `ServiceError - ${errorType || message}`;
    this.code = code || 500;
    this.errorType = errorType;
  }
}

export const sentryClient = (event: FetchEvent) => {
  const client = new Toucan({
    dsn: SENTRY_DSN,
    requestDataOptions: {
      allowedHeaders: ["user-agent"],
    },
    request: event.request,
    environment: WORKER_ENV,
  });
  return client;
};

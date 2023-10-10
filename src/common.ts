import { Toucan } from "toucan-js";

export interface WorkerEnv {
  SENTRY_DSN: string;
  WORKER_ENV: string;
  MAILERLITE_API_KEY: string;
  WAKEWORD_TRAINING_BUCKET: R2Bucket;
}

export interface CfRequest extends Request {
  cf?: IncomingRequestCfProperties;
}

export interface WorkerEvent {
  request: CfRequest;
  env: WorkerEnv;
  ctx: ExecutionContext;
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

export const sentryClient = (event: WorkerEvent) => {
  const client = new Toucan({
    dsn: event.env.SENTRY_DSN,
    requestDataOptions: {
      allowedHeaders: ["user-agent", "cf-ray"],
    },
    context: event.ctx,
    request: event.request,
    environment: event.env.WORKER_ENV,
  });
  return client;
};

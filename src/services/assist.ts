import { Toucan } from "toucan-js";
import { WorkerEvent } from "../common";

enum TRIGGER_PATH {
  WAKE_WORD_TRAINING_UPLOAD = "/assist/wake_word/training_data/upload",
}
const WAKE_WORD_ALLOWED_CONTENT_TYPES = ["audio/webm"];
const WAKE_WORD_ALLOWED_NAMES = ["casita", "ok_nabu"];
const WAKE_WORD_MAX_CONTENT_LENGTH = 250 * 1024;
const USER_CONTENT_MAX_CONTENT_LENGTH = 150;

const createResponse = (options: {
  content: Record<string, any> | string;
  status?: number;
}) =>
  new Response(JSON.stringify(options.content, null, 2), {
    status: options.status ?? 400,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json;charset=UTF-8",
    },
  });

const handleUploadAudioFile = async (event: WorkerEvent): Promise<Response> => {
  const { request } = event;
  const contentType = request.headers.get("content-type");
  const contentLength = parseInt(request.headers.get("content-length"), 10);
  const cfRay = request.headers["CF-RAY"];

  const { searchParams } = new URL(request.url);
  const distance = searchParams.get("distance");
  const speed = searchParams.get("speed");
  const wakeWord = searchParams.get("wake_word");
  const userContent = searchParams.get("user_content");
  const sanitizedUserContent = userContent
    ? userContent.replace(/[^a-zA-Z0-9]/g, "")
    : "";

  if (request.method !== "PUT") {
    return createResponse({
      content: { message: "Invalid method" },
      status: 405,
    });
  }

  if (!WAKE_WORD_ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return createResponse({
      content: {
        message: `Invalid content-type, received: ${contentType}, allowed: ${WAKE_WORD_ALLOWED_CONTENT_TYPES}`,
      },
      status: 415,
    });
  }
  if (contentLength > WAKE_WORD_MAX_CONTENT_LENGTH) {
    return createResponse({
      content: {
        message: `Invalid content-length, received: ${contentLength}, allowed [<${WAKE_WORD_MAX_CONTENT_LENGTH}]`,
      },
      status: 413,
    });
  }
  // add error check for sanitizedUserContent, not implemented so we don't break feature on frontend during implementation, update message when implemeneted
  if (!((distance && speed && wakeWord) /*&& sanitizedUserContent */)) {
    return createResponse({
      content: {
        message: `Invalid parameters: missing distance, speed or wake_word`,
      },
    });
  }

  if (!WAKE_WORD_ALLOWED_NAMES.includes(wakeWord)) {
    return createResponse({
      content: { message: `Invalid wake word, received: ${wakeWord}` },
    });
  }

  if (sanitizedUserContent.length > USER_CONTENT_MAX_CONTENT_LENGTH) {
    return createResponse({
      content: {
        message: `Invalid user content length, received: ${sanitizedUserContent.length}, allowed [<${USER_CONTENT_MAX_CONTENT_LENGTH}]`,
      },
    });
  }

  const key = `${wakeWord}-${distance}-${speed}-${sanitizedUserContent}-${cfRay}.webm`;

  await event.env.WAKEWORD_TRAINING_BUCKET.put(key, request.body);

  return createResponse({ content: { message: "success", key }, status: 201 });
};

export async function assistHandler(
  requestUrl: URL,
  event: WorkerEvent,
  sentry: Toucan
): Promise<Response> {
  if (event.request.method === "OPTIONS") {
    // CORS preflight request
    return createResponse({ content: "ok", status: 200 });
  }
  switch (requestUrl.pathname) {
    case TRIGGER_PATH.WAKE_WORD_TRAINING_UPLOAD:
      return await handleUploadAudioFile(event);
  }

  return createResponse({ content: "Not Found", status: 404 });
}

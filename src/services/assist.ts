import Toucan from "toucan-js";

enum TRIGGER_PATH {
  WAKE_WORD_TRAINING_GET_UPLOAD_URL = "/assist/wake_word/training_data/upload",
}
const WAKE_WORD_ALLOWED_CONTENT_TYPES = ["audio/webm"];
const WAKE_WORD_MIN_CONTENT_LENGTH = 10 * 1024;
const WAKE_WORD_MAX_CONTENT_LENGTH = 250 * 1024;

const getUserHash = async (request: Request): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(
    request.headers["CF-Connecting-IP"]
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

const handleGetSignedUrl = async (request: Request): Promise<Response> => {
  const contentType = request.headers.get("content-type");
  const contentLength = parseInt(request.headers.get("content-length"), 10);

  const { searchParams } = new URL(request.url);
  const distance = searchParams.get("distance");
  const speed = searchParams.get("speed");

  let preCheckErrorMessage = "";
  if (request.method !== "PUT") {
    preCheckErrorMessage = "Invalid method";
  }

  if (!WAKE_WORD_ALLOWED_CONTENT_TYPES.includes(contentType)) {
    preCheckErrorMessage = `Invalid content-type, received: ${contentType}, allowed: ${WAKE_WORD_ALLOWED_CONTENT_TYPES}`;
  } else if (
    contentLength < WAKE_WORD_MIN_CONTENT_LENGTH ||
    contentLength > WAKE_WORD_MAX_CONTENT_LENGTH
  ) {
    preCheckErrorMessage = `Invalid content-length, received: ${contentLength}, allowed [${WAKE_WORD_MIN_CONTENT_LENGTH}-${WAKE_WORD_MAX_CONTENT_LENGTH}]`;
  } else if (!(distance && speed)) {
    preCheckErrorMessage = `Invalid parameters: missing distance or speed`;
  }

  if (preCheckErrorMessage.length) {
    return new Response(
      JSON.stringify({ message: preCheckErrorMessage }, null, 2),
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json;charset=UTF-8",
        },
      }
    );
  }

  const date = new Date().toISOString().substring(0, 23).replace(/:/g, "-");
  const userHash = await getUserHash(request);
  const key = `${date}-${distance}-${speed}-${userHash}.webm`;

  await WAKEWORD_TRAINING_BUCKET.put(key, request.body);

  return new Response(JSON.stringify({ message: "success", key }, null, 2), {
    status: 201,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json;charset=UTF-8",
    },
  });
};

export async function assistHandler(
  requestUrl: URL,
  request: Request,
  sentry: Toucan
): Promise<Response> {
  switch (requestUrl.pathname) {
    case TRIGGER_PATH.WAKE_WORD_TRAINING_GET_UPLOAD_URL:
      return await handleGetSignedUrl(request);
      break;
  }

  return new Response("Not found", {
    status: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/html;charset=UTF-8",
    },
  });
}

export const STRUCTURED_RESPONSE_ERROR_STATUS = 502;

export type StructuredResponseErrorReason =
  | "empty_content"
  | "invalid_content_type"
  | "invalid_json"
  | "invalid_object"
  | "invalid_schema"
  | "incomplete_response";

export type StructuredResponseError = {
  error: "invalid_model_response";
  reason: StructuredResponseErrorReason;
  message: string;
  recoverable: true;
  retryable: false;
};

export type StructuredObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: StructuredResponseError };

export const structuredResponseError = (reason: StructuredResponseErrorReason): StructuredResponseError => ({
  error: "invalid_model_response",
  reason,
  message: "No se pudo leer una respuesta valida del analisis. Puedes volver a intentarlo manualmente o elegir otra foto.",
  recoverable: true,
  retryable: false,
});

export const parseStructuredObject = (content: unknown): StructuredObjectResult => {
  if (typeof content !== "string") {
    return { ok: false, error: structuredResponseError("invalid_content_type") };
  }
  let json = content.trim();
  if (!json) return { ok: false, error: structuredResponseError("empty_content") };

  // Only unwrap one complete transport fence. Never extract or repair JSON content.
  if (json.startsWith("```")) {
    const fenced = /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i.exec(json);
    if (!fenced) return { ok: false, error: structuredResponseError("invalid_json") };
    json = fenced[1];
  }

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: structuredResponseError("invalid_json") };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: structuredResponseError("invalid_object") };
  }
  return { ok: true, value: value as Record<string, unknown> };
};

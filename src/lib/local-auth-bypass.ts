export function isLocalAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.WEB_EVAL_IMAGE_GENERATION_LOCAL_AUTH_BYPASS === "1";
}

import { getRequest } from "@tanstack/react-start/server";

export function getRequestOrigin(): string {
  const req = getRequest();
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");

  return `${proto}://${host}`;
}
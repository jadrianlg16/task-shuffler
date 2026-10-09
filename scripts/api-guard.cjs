"use strict";
/**
 * Same-origin guard for the task API (json-server has no authentication).
 *
 * The app only ever calls the API from its own pages, through the Vite `/api`
 * proxy, so nothing from another origin needs it. The checks here refuse what
 * a hostile web page could otherwise do from the user's browser:
 *   - Origin header from another origin: covers CORS reads and writes, and
 *     "simple" form POSTs that browsers send without a preflight;
 *   - Sec-Fetch-Site cross-site / same-site (sent on https and localhost):
 *     also covers no-cors GETs such as <script> tags;
 *   - a `callback` parameter: json-server answers it with JSONP, which any
 *     page can read through a <script> tag;
 *   - (json-server only) a Host that isn't loopback, against DNS rebinding.
 * Requests with none of these headers (curl, the proxy's own calls) pass;
 * anyone who can reach the port that way can already do anything with it.
 *
 * Used twice: as a json-server middleware (`--middlewares`, see scripts/dev.mjs
 * and scripts/docker-start.sh) and in front of the Vite proxy (vite.config.ts).
 */

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** "host[:port]" as the URL parser normalises it, or null if it isn't one. */
function normalizeHost(value) {
  try {
    return new URL(`http://${value}`).host;
  } catch {
    return null;
  }
}

/** The single value of a header that may arrive as a list. */
function header(headers, name) {
  const value = headers[name];
  return Array.isArray(value) ? value.join(",") : value;
}

/**
 * Why a request must be refused, or null if it may go through.
 * @param {{ url?: string, headers: Record<string, string | string[] | undefined> }} req
 * @param {{ appHost: string | null | undefined, loopbackOnly?: boolean }} options
 *   appHost: the host:port the browser used to reach the app (compared by host
 *   and port only, so a TLS proxy in front still matches); null when unknown,
 *   in which case any Origin is refused. loopbackOnly: also require a loopback Host.
 * @returns {string | null}
 */
function rejectReason(req, { appHost, loopbackOnly = false }) {
  const headers = req.headers;

  if (loopbackOnly) {
    const host = normalizeHost(header(headers, "host") ?? "");
    const hostname = host === null ? "" : new URL(`http://${host}`).hostname;
    if (!LOOPBACK_HOSTNAMES.has(hostname)) return "unexpected Host";
  }

  const site = header(headers, "sec-fetch-site");
  if (site !== undefined && site !== "same-origin" && site !== "none") return "cross-site request";

  const origin = header(headers, "origin");
  if (origin !== undefined) {
    let originHost = null;
    try {
      originHost = new URL(origin).host; // "null" (sandboxed pages) throws
    } catch {
      /* refused below */
    }
    const expected = appHost ? normalizeHost(appHost) : null;
    if (originHost === null || expected === null || originHost !== expected)
      return "cross-origin request";
  }

  if (new URL(req.url ?? "/", "http://localhost").searchParams.has("callback"))
    return "JSONP is disabled";

  return null;
}

/** 403 with a short JSON reason. */
function refuse(res, reason) {
  res.statusCode = 403;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: `Forbidden: ${reason}` }));
}

/**
 * json-server middleware. Behind the Vite proxy the app's host arrives in
 * X-Forwarded-Host (the proxy appends its value last); a direct request has no
 * app host, so it may not carry an Origin at all.
 */
function apiGuard(req, res, next) {
  const forwarded = header(req.headers, "x-forwarded-host");
  const appHost = forwarded ? forwarded.split(",").pop().trim() : null;
  const reason = rejectReason(req, { appHost, loopbackOnly: true });
  if (reason) refuse(res, reason);
  else next();
}

/** Connect middleware for the Vite dev/preview servers, in front of the proxy. */
function proxyGuard(req, res, next) {
  const reason = rejectReason(req, { appHost: header(req.headers, "host") ?? null });
  if (reason) refuse(res, reason);
  else next();
}

module.exports = apiGuard;
module.exports.apiGuard = apiGuard;
module.exports.proxyGuard = proxyGuard;
module.exports.rejectReason = rejectReason;

const configuredBaseUrl = process.env.REACT_APP_API_URL || "";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const defaultBaseUrl = isLocalhost
  ? "http://127.0.0.1:5000"
  : window.location.origin;

function normalizeApiUrl(baseUrl) {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

  return cleanBaseUrl.endsWith("/api")
    ? cleanBaseUrl
    : `${cleanBaseUrl}/api`;
}

export const API_URL = normalizeApiUrl(configuredBaseUrl || defaultBaseUrl);

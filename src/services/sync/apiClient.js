import axios from "axios";

const normalizeBaseUrl = (baseUrl) => {
  const trimmed = String(baseUrl || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const createApiClient = ({ baseUrl, token }) => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    throw new Error("baseUrl is required");
  }

  const instance = axios.create({
    baseURL: normalized,
    timeout: 20000,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return instance;
};

export default { createApiClient };

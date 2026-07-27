import type { User } from "firebase/auth";

const defaultApiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "https://wise-api-11334970742.africa-south1.run.app";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_WISE_API_BASE_URL ??
  defaultApiBaseUrl;

export type ApiResult = {
  status: number;
  body: unknown;
};

export type AuthProfile = {
  userId: string;
  firebaseUid: string;
  roles: string[];
  permissions: string[];
};

export async function callWiseApi(
  user: User,
  path: string,
  options: RequestInit = {},
): Promise<ApiResult> {
  const token = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body,
  };
}

export async function getAuthProfile(user: User): Promise<AuthProfile> {
  const result = await callWiseApi(user, "/auth/me");

  if (result.status !== 200) {
    throw new Error(`Unable to load auth profile: ${result.status}`);
  }

  const profile = (result.body as { data?: AuthProfile } | null)?.data;
  if (!profile) {
    throw new Error("Auth profile response did not include user data.");
  }

  return profile;
}

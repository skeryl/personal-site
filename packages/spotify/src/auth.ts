/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code with PKCE oAuth2 flow to authenticate
 * against the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */
import { ApiErrorResponse, ErrorObject, PrivateUserObject } from "./index";
import { SpotifyClient } from "./spotify-client";

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

const clientId = "6407d11ff4a34e47a583ddea34c7d1d7"; // your clientId
const redirectUrl = "http://localhost:5173/journal/playlist-helper"; // your redirect URL - must be localhost URL and/or HTTPS

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = `user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing streaming`;

// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
  get access_token() {
    return localStorage.getItem("access_token") || null;
  },
  get refresh_token() {
    return localStorage.getItem("refresh_token") || null;
  },
  get expires_in() {
    return localStorage.getItem("refresh_in") || null;
  },
  get expires() {
    return localStorage.getItem("expires") || null;
  },

  save: function (response: AuthResponse | null) {
    if (response == null) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("expires_in");
      localStorage.removeItem("expires");
      return;
    }
    const { access_token, refresh_token, expires_in } = response;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("expires_in", expires_in.toString());

    const now = new Date();
    const expiry = new Date(now.getTime() + expires_in * 1000);
    localStorage.setItem("expires", expiry.toString());
  },
};

export enum ClientInitState {
  UNINITIALIZED = "UNINITIALIZED",
  LOG_IN_REQUIRED = "LOG_IN_REQUIRED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  AUTHENTICATED = "AUTHENTICATED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export async function init(client: SpotifyClient): Promise<ClientInitState> {
  // On page load, try to fetch auth code from current browser search URL
  const args = new URLSearchParams(window.location.search);
  const code = args.get("code");

  // If we find a code, we're in a callback, do a token exchange
  if (code) {
    const token = await getToken(code);
    currentToken.save(token);

    // Remove code from URL so we can refresh correctly.
    const url = new URL(window.location.href);
    url.searchParams.delete("code");

    const updatedUrl = url.search ? url.href : url.href.replace("?", "");
    window.history.replaceState({}, document.title, updatedUrl);
  }

  // If we have a token, we're logged in, so fetch user data and render logged in template
  if (currentToken.access_token) {
    client.setToken(currentToken.access_token);
    try {
      const userData = await client.getCurrentProfile();
      const error = userData as ErrorObject;
      console.log("userData response in init: ", userData);
      if (error.status === 401) {
        return ClientInitState.TOKEN_EXPIRED;
      }
    } catch (e) {
      console.error("Error fetching user data", e);
      return ClientInitState.UNKNOWN_ERROR;
    }
    return ClientInitState.AUTHENTICATED;
  }

  // Otherwise we're not logged in, so render the login template
  if (!currentToken.access_token) {
    console.log("rendering template for login");
    return ClientInitState.LOG_IN_REQUIRED;
  }

  return ClientInitState.UNINITIALIZED;
}

async function redirectToSpotifyAuthorize() {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = randomValues.reduce(
    (acc, x) => acc + possible[x % possible.length],
    "",
  );

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);

  const code_challenge_base64 = btoa(
    String.fromCharCode(...new Uint8Array(hashed)),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  window.localStorage.setItem("code_verifier", code_verifier);

  const authUrl = new URL(authorizationEndpoint);
  const params = {
    response_type: "code",
    client_id: clientId,
    scope: scope,
    code_challenge_method: "S256",
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString(); // Redirect the user to the authorization server for login
}

// Soptify API Calls
async function getToken(code: string) {
  const code_verifier = localStorage.getItem("code_verifier");

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier ?? "",
    }),
  });

  return await response.json();
}

async function getRefreshToken(): Promise<AuthResponse | ApiErrorResponse> {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: currentToken.refresh_token ?? "",
    }),
  });

  return await response.json();
}

async function getUserData() {
  const response = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: "Bearer " + currentToken.access_token },
  });

  return await response.json();
}

// Click handlers
export async function loginWithSpotifyClick() {
  await redirectToSpotifyAuthorize();
}

async function logoutClick() {
  localStorage.clear();
  window.location.href = redirectUrl;
}

export async function refreshToken() {
  const token = await getRefreshToken();
  console.log("refresh token response: ", token);
  if ((token as ApiErrorResponse).error) {
    currentToken.save(null);
    return null;
  }
  currentToken.save(token as AuthResponse);
  return currentToken.access_token as string;
}

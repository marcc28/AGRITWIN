export let currentUsername = '';
export let accessToken = '';

export function setAuth(username: string, token: string) {
  currentUsername = username;
  accessToken = token;
}

export function clearAuth() {
  currentUsername = '';
  accessToken = '';
}
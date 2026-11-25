export const authFetch = (url, options = {}) => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const token = localStorage.getItem('token') || userData.token || '';
  const accountId = userData.account_id || userData.id || '';

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(accountId ? { 'x-account-id': String(accountId) } : {})
  };

  return fetch(url, { ...options, headers });
};
// The test against a real n8n creates users, keys and workflows on the instance it is pointed at. That is
// fine on a throwaway one and a disaster on a real one, so it refuses anything that is not on
// this machine, whatever it is told.

const LOCAL = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * @param {string} address
 * @returns {string} the address without a trailing slash
 */
export function assertThrowawayInstance(address) {
  let url;
  try {
    url = new URL(address);
  } catch {
    throw new Error(`"${address}" is not an address.`);
  }
  if (!LOCAL.has(url.hostname) || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(
      'The test against a real n8n only runs against an n8n on this machine, because it creates users, keys and workflows on it.',
    );
  }
  if (url.username !== '' || url.password !== '' || url.pathname.replace(/\/+$/, '') !== '') {
    throw new Error('Give the address of the instance alone, such as http://127.0.0.1:5678.');
  }
  return `${url.protocol}//${url.host}`;
}

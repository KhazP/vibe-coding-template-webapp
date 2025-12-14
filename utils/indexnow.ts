// IndexNow Submission Helper
// Use this to notify search engines when you update content

const INDEXNOW_KEY = 'b836e2e568cb46229061106069c69405';
const HOST = 'vibeworkflow.app';

/**
 * Submit URLs to IndexNow for instant indexing
 * @param {string[]} urls - Array of URLs to submit (max 10,000 per request)
 * @returns {Promise<Response>}
 */
export async function submitToIndexNow(urls: string[]): Promise<Response> {
    const endpoint = 'https://api.indexnow.org/indexnow';

    const payload = {
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        // IndexNow returns:
        // 200 = Success
        // 400 = Bad request (invalid format)
        // 403 = Forbidden (key verification failed)
        // 422 = Unprocessable Entity (invalid URLs)
        // 429 = Too Many Requests

        console.log(`IndexNow submission: ${response.status} ${response.statusText}`);
        return response;
    } catch (error) {
        console.error('IndexNow submission failed:', error);
        throw error;
    }
}

/**
 * Submit a single URL to IndexNow
 */
export async function notifyUrlChange(url: string): Promise<Response> {
    return submitToIndexNow([url]);
}

// Manual usage example (run in browser console after deploy):
// import { submitToIndexNow } from './utils/indexnow';
//
// // Submit all main pages at once:
// submitToIndexNow([
//   'https://vibeworkflow.app/',
//   'https://vibeworkflow.app/projects',
//   'https://vibeworkflow.app/research',
//   'https://vibeworkflow.app/design',
//   'https://vibeworkflow.app/build',
//   'https://vibeworkflow.app/export'
// ]);

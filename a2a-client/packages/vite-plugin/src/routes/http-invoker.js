import http from 'http';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';
import { A2A_TRACE_HEADER } from '@a2a-client/shared/a2a-trace-constants.mjs';
export function sendHttpRequest({ requestToServer, onResponse, onError, traceId }) {
    const a2aServerUrl = getA2aServerBaseUrl();
    const urlObj = new URL(`${a2aServerUrl}/api/v1/invoke`);
    const headers = { 'Content-Type': 'application/json' };
    const tid = typeof traceId === 'string' ? traceId.trim() : '';
    if (tid) {
        headers[A2A_TRACE_HEADER] = tid;
    }
    const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers,
    };
    const xhrReq = http.request(reqOptions, (xhrRes) => {
        let data = '';
        xhrRes.on('data', (chunk) => (data += chunk));
        xhrRes.on('end', () => {
            onResponse(xhrRes, data);
        });
    });
    xhrReq.on('error', onError);
    xhrReq.write(JSON.stringify(requestToServer));
    xhrReq.end();
}

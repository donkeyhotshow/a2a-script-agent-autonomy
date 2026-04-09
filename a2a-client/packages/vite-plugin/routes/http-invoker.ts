import http from 'http';
import { getA2aServerBaseUrl } from '@a2a/shared/a2a-server-base.ts';

export function sendHttpRequest({ requestToServer, onResponse, onError }) {
    const a2aServerUrl = getA2aServerBaseUrl();
    const urlObj = new URL(`${a2aServerUrl}/api/v1/invoke`);

    const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
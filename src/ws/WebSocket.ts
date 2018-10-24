
import * as path from 'path';
import { parse as ParseUrl } from 'url';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import * as tls from 'tls';
import * as crypto from 'crypto';

import { WsContext, WsContextState } from './WsContext';
import { WEBSOCKET_GUID } from './WsUtils';
import { HttpUpgradeHandler, HttpUpgradeContext } from '../http/HttpUpgradeContext';



const SUPPORTED_PROTOCOLS = ['wss:', 'ws:'];


export interface WebSocketConnectOptions {
    origin?: string;
    headers?: { [k: string]: string };


}


/**
 * WebSocket client implementation for servers
 */
export class WebSocket extends WsContext {

    private _context: WsContext;

    constructor(url?: string, headers: { [k: string]: string } = {}) {
        super();

        // constructed as a client
        if(typeof url === 'string') {
            this.connect(url, headers)
        }
        
    }

    get readyState() {
        return this._state;
    }


    /**
     * Connect to a ws server
     * @param url 
     * @param headers 
     */
    private connect(url: string, headers: { [k: string]: string }) {

        const parsed_url = ParseUrl(url);

        if (SUPPORTED_PROTOCOLS.indexOf(parsed_url.protocol) == -1) {
            throw new Error(`WebSocket: Url protocol must be one of ${SUPPORTED_PROTOCOLS}. 
                Got ${parsed_url.protocol}.`);
        }

        const use_tls = parsed_url.protocol === 'wss';
        const http_client: any = use_tls ? https : http;

        const key = crypto.randomBytes(16).toString('base64');

        headers = Object.assign({
            'Sec-WebSocket-Version': 13,
            'Sec-WebSocket-Key': key,
            'Connection': 'Upgrade',
            'Upgrade': 'websocket'
        }, headers);


        let request_options: http.RequestOptions = {
            method: 'GET',
            protocol: use_tls ? 'https:' : 'http:',
            host: parsed_url.hostname,
            path: parsed_url.path + (parsed_url.query || ''),
            port: parsed_url.port || (use_tls ? 443 : 80),
            headers: headers,

        }
        // create request
        let request: http.ClientRequest = http_client.request(request_options)

        request.on("error", (err) => {

            this._state = WsContextState.Closing;
            this.emit('error', err);
            this.close();

        });

        request.on("response", (res: http.IncomingMessage) => {
            this.abort(request.socket, `Unexpected server response: ${res.statusCode}`);
        });

        request.on("upgrade",
            (res: http.IncomingMessage, socket: net.Socket, head: Buffer) => {

                if (this.readyState !== WsContextState.Connecting) {
                    return;
                }

                const digest = crypto.createHash('sha1')
                    .update(key + WEBSOCKET_GUID, 'ascii')
                    .digest('base64');


                if (res.headers['sec-websocket-accept'] !== digest) {
                    this.abort(socket, 'Invalid Sec-WebSocket-Accept header');
                    return;
                }

                this.assignSocket(socket, head);

            });

            request.end();


    }

    private abort(socket: net.Socket, reason: string) {

        this._state = WsContextState.Closing;

        const err = new Error(reason);

        this.emit('error', err);
        this.emit('close');

        socket.destroy();

    }

}

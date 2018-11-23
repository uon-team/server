import { Module } from "@uon/core";
import { ClusterModule } from "../cluster/ClusterModule";
import { WEBSOCKET_GUID } from "./WsUtils";
import { WebSocket } from "./WebSocket";
import { OutgoingHttpHeaders } from "http";
import * as crypto from 'crypto';
import { HttpContext, HttpUpgradeHandler, HTTP_UPGRADE_HANDLER, HttpError } from "../http";



@Module({
    imports: [
        ClusterModule,
    ],
    providers: [
        {
            token: HTTP_UPGRADE_HANDLER,
            value: <HttpUpgradeHandler<WebSocket>>{
                protocol: 'websocket',
                type: WebSocket,
                accept: UpgradeToWebSocket
            },
            multi: true
        }
    ]
})
export class WsModule { }



async function UpgradeToWebSocket(context: HttpContext, extraHeaders: OutgoingHttpHeaders) {

    const req = context.request;
    const socket = req.socket;
    const version = +req.headers['sec-websocket-version'];
    const upgrade = req.headers.upgrade.toLowerCase();
    const key = req.headers['sec-websocket-key'] as string;

    // test prerequisites
    if (req.method !== 'GET' ||
        upgrade !== 'websocket' ||
        !key ||
        (version !== 8 && version !== 13)) {

        throw new HttpError(400);
    }


    if (!socket.readable || !socket.writable) {
        throw new HttpError(400);
    }

    // create the response key
    const res_key = crypto.createHash('sha1')
        .update(key + WEBSOCKET_GUID, 'ascii')
        .digest('base64');

    const headers = Object.assign(extraHeaders, {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': res_key
    });

    let res = socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.keys(headers).map(h => `${h}: ${headers[h]}`).join('\r\n') + 
        `\r\n\r\n`
    );

    // create websocket
    let ws = new WebSocket();

    // let WsContext be a friend
    (ws as any).assignSocket(socket, context.head);

    return ws;


}
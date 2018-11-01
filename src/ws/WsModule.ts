import { Module } from "@uon/core";
import { ClusterModule } from "../cluster/ClusterModule";
import { HTTP_UPGRADE_HANDLER } from "../http/HttpServer";
import { HttpUpgradeHandler, HttpUpgradeContext } from "../http/HttpUpgradeContext";
import { WEBSOCKET_GUID } from "./WsUtils";
import { WebSocket } from "./WebSocket";
import * as crypto from 'crypto';


@Module({
    imports: [
        ClusterModule,
    ],
    providers: [
        {
            token: HTTP_UPGRADE_HANDLER,
            factory: (): HttpUpgradeHandler => {

                return {
                    protocol: 'websocket',
                    type: WebSocket,
                    accept: UpgradeToWebSocket
                };
            },
            deps: [],
            multi: true
        }
    ]
})
export class WsModule { }



function UpgradeToWebSocket(context: HttpUpgradeContext): Promise<WebSocket> {

    const req = context.request;
    const socket = context.socket;
    const version = +req.headers['sec-websocket-version'];
    const upgrade = req.headers.upgrade.toLowerCase();
    const key = req.headers['sec-websocket-key'] as string;

    // test prerequisites
    if (req.method !== 'GET' ||
        upgrade !== 'websocket' ||
        !key ||
        (version !== 8 && version !== 13)) {

        return context.abort(400, "Bad Request").then(() => {
            return null;
        });
    }


    if (!socket.readable || !socket.writable) {
        socket.destroy();
        return Promise.resolve(null);
    }

    // create the response key
    const res_key = crypto.createHash('sha1')
        .update(key + WEBSOCKET_GUID, 'ascii')
        .digest('base64');

    const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${res_key}`
    ];

    socket.write(headers.concat('\r\n').join('\r\n'));

    // create websocket
    let ws = new WebSocket();

    // let WsContext be a friend
    (ws as any).assignSocket(context.socket, context.head);

    return Promise.resolve(ws);


}
import { Injectable, Inject } from "@uon/core";
import { HttpUpgradeContext } from "../http/HttpUpgradeContext";
import { STATUS_CODES, OutgoingHttpHeaders } from "http";
import { Socket } from "net";
import * as crypto from 'crypto';
import { WsContext } from "./WsContext";
import { WEBSOCKET_GUID } from "./WsUtils";


@Injectable()
export class WsService {


    private _clients: { [k: string]: WsContext } = {};

    constructor() {


    }


    /**
     * Upgrade an HttpUpgradeContext to a WsContext
     * @param context 
     */
    upgrade(context: HttpUpgradeContext): Promise<WsContext> {

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
            

        // mark as accepted
        context.accept();

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

        // create context
        let ws = new WsContext();

        // let's WsContext a friend
        (ws as any).assignSocket(context.socket, context.head);

        // add to client list;
        this._clients[ws.id] = ws;

        // remove reference on close
        ws.on('close', () => {
            delete this._clients[ws.id];
        });

        return Promise.resolve(ws);


    }

    /**
     * Reject a connection
     * @param context 
     * @param code 
     */
    reject(context: HttpUpgradeContext, code: number, message?: string) {

        // abort upgrade
        return context.abort(code, message);

    }


    /**
     * Broadcast a message to all connected clients
     */
    broadcast(message: Buffer | string) {


    }
}

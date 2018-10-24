import { HttpRequest } from "./HttpRequest";
import { IncomingMessage, OutgoingHttpHeaders, STATUS_CODES } from "http";
import { Socket } from "net";
import { RouteMatch, Injector, Provider, Type } from "@uon/core";
import { HttpResponse } from "./HttpResponse";
import { resolveCname } from "dns";


const EMPTY_OBJECT = {};

export interface HttpUpgradeHandler {
    protocol: string;
    type: Type<any>;
    accept(uc: HttpUpgradeContext): Promise<any>;
}


/**
 * Interface for accepting and rejecting upgrade requests
 */
export class HttpUpgradeContext {

    readonly request: HttpRequest;
    readonly socket: Socket;
    readonly protocol: string

    private _res: HttpResponse;

    constructor(req: IncomingMessage, readonly head: Buffer, private _handler: HttpUpgradeHandler) {

        this.request = new HttpRequest(req);
        this.socket = req.socket;
        this.protocol = req.headers.upgrade.toLowerCase();

    }

    setResponse(res: HttpResponse) {
        this._res = res;
    }

    /**
     * Accept the upgrade request thru the handler
     * @param type 
     */
    accept<T>(type: Type<T>): Promise<T> {

        // mark as response as set to avoid closing down the connection
        this._res.markAsSent();

        if (type !== this._handler.type) {
            throw new Error(`Wrong type provided. Expected ${this._handler.type.name}, got ${type.name}`);
        }

        return this._handler.accept(this);

    }


    /**
     * Abort the upgrade process and terminate the connection
     * @param code 
     * @param message 
     * @param headers 
     */
    abort(code: number, message: string, headers: OutgoingHttpHeaders = EMPTY_OBJECT) {

        this._res.markAsSent();

        const socket = this.socket;

        if (socket.writable) {

            message = message || STATUS_CODES[code] || '';
            headers = Object.assign({
                'Connection': 'close',
                'Content-type': 'text/plain',
                'Content-Length': Buffer.byteLength(message)
            }, headers);

            let res = socket.write(
                `HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\n` +
                Object.keys(headers).map(h => `${h}: ${headers[h]}`).join('\r\n') +
                '\r\n\r\n' +
                message
            );

        }

        socket.destroy();

        return Promise.resolve();


    }

}
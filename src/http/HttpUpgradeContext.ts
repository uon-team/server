import { HttpRequest } from "./HttpRequest";
import { IncomingMessage } from "http";
import { Socket } from "net";
import { RouteMatch, Injector, Provider, Type } from "@uon/core";
import { GetHttpContextDefaultProviders } from "./HttpConfig";


/**
 * Parameters for HttpContext constructor
 */
export interface HttpUpgradeContextOptions {

    /**
     * The root injector
     */
    injector: Injector;

    /**
     * the request coming from node http server
     */
    req: IncomingMessage;

    /**
     * The first bytes coming from the upgrade request
     */
    head: Buffer;

}

export class HttpUpgradeContext {

    readonly request: HttpRequest;
    readonly socket: Socket;
    readonly head: Buffer;

    readonly rootInjector: Injector;

    constructor(options: HttpUpgradeContextOptions) {

        this.rootInjector = options.injector;
        this.request = new HttpRequest(options.req);
        this.socket = options.req.socket;
        this.head = options.head;

    }


}
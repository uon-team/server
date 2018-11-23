import { EventSource, Type, Injector, Provider, InjectionToken, GetTypeMetadata } from '@uon/core';
import { Router, RouteMatch, ActivatedRoute, IRouteGuardService, Controller, RouteGuard } from '@uon/router';
import { IncomingMessage, ServerResponse, OutgoingHttpHeaders, STATUS_CODES } from 'http';
import { parse as UrlParse, Url } from 'url';

import { HttpError } from './HttpError';
import { DEFAULT_CONTEXT_PROVIDERS } from './HttpConfig';

import { HttpResponse } from './HttpResponse';
import { HttpRequest, HTTP_REQUEST_BODY_CONFIG } from './HttpRequest';
import { Socket } from 'net';

/**
 * Multi provider token for upgrade handlers
 */
export const HTTP_UPGRADE_HANDLER = new InjectionToken<HttpUpgradeHandler<any>>("Multi provider for upgrade handlers");

/**
 * Declares a handler for http upgrades
 */
export interface HttpUpgradeHandler<T> {
    protocol: string;
    type: Type<T>;
    accept(uc: HttpContext, headers: OutgoingHttpHeaders): Promise<T>;
}


/**
 * Parameters for HttpContext constructor
 */
export interface HttpContextOptions {

    // the root injector
    injector: Injector;

    // the request coming from node http server
    req: IncomingMessage;

    // the response object from node's http server
    res: ServerResponse;

    // a list of providers for the request-scoped injector
    providers: Provider[];

    // optional head buffer used in upgrade
    head?: Buffer;

}

/**
 * An object containing the state of a request and response and acts as an
 * as the root injector for the routing and instanciating of the controllers 
 *
 */
export class HttpContext {

    readonly request: HttpRequest;
    readonly response: HttpResponse;
    readonly uri: Url;
    readonly head: Buffer;

    private _root: Injector;
    private _injector: Injector;
    private _providers: Provider[];
    private _processing: boolean = false;


    /**
     * Creates a new context for the isolated request specific app
     * @param req 
     * @param res 
     */
    constructor(options: HttpContextOptions) {

        this._root = options.injector;
        this._providers = options.providers;

        this.request = new HttpRequest(options.req);
        this.response = new HttpResponse(options.res);

        this.head = options.head;
    }

    /**
     * Process the matching routes
     */
    async process(match: RouteMatch) {

        // fool guard
        if (this._processing) {
            throw new Error(`You cannot call process() twice.`);
        }
        this._processing = true;

        // 404 on no match
        if (!match) {
            throw new HttpError(404);
        }

        // create the injector
        this._injector = Injector.Create(this.getProviderList(match), this._root);

        // process route guards
        const guard_pass = await this.processRouteGuards(match.guards);

        // all guards must pass to continue
        if (!guard_pass) {

            // precondition failed
            throw new HttpError(412);

        }

        // process match
        return await this.processMatch(match);

    }


    /**
     * Attempt a connection upgrade to a type declared in an HttpUpgradeHandler
     * @param type 
     */
    async upgrade<T>(type: Type<T>, headers: OutgoingHttpHeaders = {}) {

        if (!this.request.headers.upgrade) {
            throw new Error('Cannot upgrade connection, no Upgrade header in request.');
        }

        // grab all defined upgrade handlers
        const handlers: HttpUpgradeHandler<any>[] = this._root.get(HTTP_UPGRADE_HANDLER, []);

        // get type upgrade type in the request header
        const protocol = this.request.headers.upgrade.toLowerCase();

        // select the corresponding upgrade handler
        let handler: HttpUpgradeHandler<T>;
        for (let i = 0; i < handlers.length; ++i) {
            if (handlers[i].protocol === protocol) {
                handler = handlers[i];
                break;
            }
        }

        if(!handler) {
            throw new Error(`No handler for upgrade protocol ${protocol}`);
        }

        if (type !== handler.type) {
            throw new Error(`Wrong type provided. Expected ${handler.type.name}, got ${type.name}`);
        }

        return handler.accept(this, headers);

    }

    /**
     * Aborts the connection
     * @param code 
     * @param message 
     */
    async abort(code: number, message: string, headers: OutgoingHttpHeaders = {}) {

        const socket = this.request.socket;

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
    }

    /**
     * Call route guards sequentially, 
     * rejects when the first guards returns false
     * @param guards 
     * @param injector 
     */
    private async processRouteGuards(guards: RouteGuard[]) {

        const injector = this._injector;
        const ac: ActivatedRoute = injector.get(ActivatedRoute);

        // iterate over all guards
        for (let i = 0; i < guards.length; ++i) {

            let guard = await injector.instanciateAsync(guards[i]);
            let result = await guard.checkGuard(ac);

            if (!result) {
                return false;
            }
        }

        return true;
    }

    private async processMatch(match: RouteMatch) {

        const ctrl = await this._injector.instanciateAsync(match.controller)

        return ctrl[match.handler.methodKey]();
    }

    private getProviderList(match: RouteMatch) {

        // we need a list of providers before we create an injector
        // start with this for a start
        let providers: Provider[] = [
            {
                token: HttpContext,
                value: this
            },
            {
                token: HttpResponse,
                value: this.response
            },
            {
                token: HttpRequest,
                value: this.request
            },

            {
                token: ActivatedRoute,
                value: match.toActivatedRoute()
            }
        ];

        // append all extra providers
        providers = providers.concat(DEFAULT_CONTEXT_PROVIDERS as Provider[], this._providers);

        // get controller specific providers
        let controller_meta: Controller = GetTypeMetadata(match.controller).filter(t => t instanceof Controller)[0];
        if (controller_meta && controller_meta.providers) {
            providers = providers.concat(controller_meta.providers);
        }

        return providers;

    }


}






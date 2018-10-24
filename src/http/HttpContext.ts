import { EventSource, ObjectUtils, ArrayUtils, Type, Router, RouteMatch, Injector, Provider, InjectionToken } from '@uon/core';

import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import { parse as UrlParse, Url } from 'url';
import { parse as QueryParse } from 'querystring';
import { TLSSocket } from 'tls';
import { ReadStream } from 'fs';

import { HttpError } from './HttpError';
import { DEFAULT_CONTEXT_PROVIDERS } from './HttpConfig';
import { HttpController } from './HttpRouter';

import { HttpResponse } from './HttpResponse';
import { HttpRequest } from './HttpRequest';
import { HttpUpgradeContext } from './HttpUpgradeContext';


/**
 * Injection for initializing the context prior to execution
 */
export const HTTP_CONTEXT_INITIALIZER = new InjectionToken<any[]>("Http Context Initializers");

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
}

/**
 * An object containing the state of a request and response and acts as an
 * as the root injector for the routing and instanciating of the controllers 
 *
 */
export class HttpContext extends EventSource {

    readonly request: HttpRequest;
    readonly response: HttpResponse;
    readonly uri: Url;

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

        super();

        this._root = options.injector;
        this._providers = options.providers;

        this.request = new HttpRequest(options.req);
        this.response = new HttpResponse(options.res);

    }

    /**
     * Adds an event listener to be called before an error is sent,
     * this can be used to intercept errors and handle them gracefully
     */
    on(type: 'error', callback: (context: HttpContext, error: HttpError) => any, priority?: number): void;


    /**
     * generic
     */
    on(type: string, callback: any, priority: number = 100): void {
        return super.on(type, callback, priority);
    }


    /**
     * Process the matching routes
     */
    process(matches: RouteMatch[]) {

        // fool guard
        if (this._processing) {
            throw new Error(`You cannot call process() twice.`);
        }
        this._processing = true;


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
        ];

        // get all providers

        // append all extra providers
        providers = providers.concat(DEFAULT_CONTEXT_PROVIDERS as Provider[], this._providers);

        // create the injector
        this._injector = Injector.Create(providers, this._root);

        // start a promise chain
        let promise_chain = Promise.resolve();


        // instanciate controllers
        matches.forEach((m) => {

            // grab the function name to call on the controller
            let method_key = m.route.metadata.key;

            // params to array
            const params: string[] = [];
            for (let j = 0; j < m.route.keys.length; ++j) {
                let k = m.route.keys[j].name;
                params.push(m.params[k]);
            }

            // get the parent chain
            let ctrls: Type<any>[] = [];

            // create an injector for the match
            let injector = Injector.Create([], this._injector);


            // call the handler in sequence
            promise_chain = promise_chain.then(() => {

                // if a response was sent ignore the rest
                if (this.response.sent) {
                    return;
                }

                // instanciate the controller
                return injector.instanciateAsync(m.router.type)
                    .then((ctrl) => {

                        // call the method on the controller
                        return ctrl[method_key](m.params);
                    });

            });


        });

        // return the promise chain
        return promise_chain
            .then(() => {
    
                // if no response was sent delegate the error to the 'error listeners'
                if (!this.response.sent) {

                    // might be an upgrade
                    let upgrade: HttpUpgradeContext = this._injector.get(HttpUpgradeContext);
                    if (upgrade) {
                        return upgrade.abort(404, 'Not found');
                    }

                    throw new HttpError(404);
                }


            })
            .catch((err) => {

                let error = err instanceof HttpError ?
                    err : new HttpError(500, null, JSON.stringify(err.stack));

                return this.emit('error', this, error)
                    .then(() => {

                        // that was the final chance to respond, delegating error to server
                        if (!this.response.sent) {
                            throw error;
                        }

                    });

            });

    }


}






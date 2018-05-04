import { EventSource, ObjectUtils, ArrayUtils, Type, Router, RouteMatch, Injector, Provider, InjectionToken } from '@uon/core';

import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import { parse as UrlParse, Url } from 'url';
import { parse as QueryParse } from 'querystring';
import { TLSSocket } from 'tls';
import { ReadStream } from 'fs';

import { HttpError } from './HttpError';
import { GetHttpContextDefaultProviders } from './HttpConfig';
import { HttpRouter } from './HttpRouter';


const DEFAULT_OUTGOING_HEADERS = {
    'X-Powered-By': "UON"
};

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

    // the router on which the context operates 
    router: Router<HttpRouter>;
}

/**
 * An object containing the state of a request and response and acts as an
 * as the root injector for the routing and instanciating of the controllers 
 *
 */
export class HttpContext extends EventSource {

    readonly request: IncomingMessage;
    readonly response: ServerResponse;
    readonly uri: Url;

    private _root: Injector;
    private _injector: Injector;
    private _providers: Provider[];
    private _router: Router<HttpRouter>;


    /**
     * Creates a new context for the isolated request specific app
     * @param req 
     * @param res 
     */
    constructor(options: HttpContextOptions) {

        super();

        this._root = options.injector;
        this._providers = options.providers;

        this.request = options.req;
        this.response = options.res;

        this._router = options.router;

        this.uri = ParseUrl(options.req);
        //this.method = options.req.method;

    }

    /**
     * Whether the connection is secure or not (over https)
     */
    get secure(): boolean {
        return (this.request.connection instanceof TLSSocket);
    }

    /**
     * Whether a response was sent, we consider a response sent when at least the headers have been sent
     */
    get responseSent(): boolean {
        return this.response.headersSent || this.response.finished;
    }


    /**
     * Adds an event listener to be called before the response is sent, 
     * can be used to set headers and status code
     */
    on(type: 'response', callback: (context: HttpContext, headers: OutgoingHttpHeaders) => any, priority?: number): void;

    /**
     * Adds an event listener to be called before an error is sent,
     * this can be used to intercept errors an treat them properly
     */
    on(type: 'error', callback: (context: HttpContext, error: HttpError) => any, priority?: number): void;


    /**
     * generic
     */
    on(type: string, callback: any, priority: number = 100): void {
        return super.on(type, callback, priority);
    }


    /**
     * Process the request
     */
    process() {

        // get the app's root router
        const router: Router<HttpRouter> = this._router;

        // get the set of matches, if any
        const matches = router.match(this.uri.pathname, { method: this.request.method });

        // we need a list of providers before we create an injector
        // start with this for a start
        let providers: Provider[] = [{
            token: HttpContext,
            value: this
        }];
        
        // append all extra providers
        providers = providers.concat(GetHttpContextDefaultProviders(), this._providers);

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


            // call the handler in sequence
            promise_chain = promise_chain.then(() => {

                // if a response was sent ignore the rest
                if(this.responseSent) {
                    return;
                }

                // instaciate the controller
                return this._injector.instanciateAsync(m.router.type).then((ctrl) => {
                    
                    // call the method on the controller
                    return ctrl[method_key](...params);
                });

            });


        });

        // return the promise chain
        return promise_chain.then(() => {

            // if no response was sent from any of the matches, we got a 404
            if(!this.responseSent) {
                throw new HttpError(404);
            }

        }).catch((err) => {

            let error = err instanceof HttpError ? 
                err : new HttpError(500, null, JSON.stringify(err.stack));
            
            return this.emit('error', this, error).then(() => {

                // that was the final chance to respond
                if(!this.responseSent) {
                    throw error;
                }
                
            });

        });

    }


    /**
     * Send a response
     * @param data 
     * @param statusCode 
     * @param headers 
     */
    send(data: any, statusCode?: number, headers?: OutgoingHttpHeaders) {


        if(this.responseSent) {
            console.warn('Response already sent');
            return;
        }

        // default status code 200 if none provided
        let status = statusCode || 200;

        // merge defaults with provided headers
        headers = ObjectUtils.extend({}, DEFAULT_OUTGOING_HEADERS, headers);

        // emit the response event so the user can change headers or whatever if he wants
        return this.emit('response', this, headers).then(() => {

            // if content type is json and data is an object, stringify before sending
            if (headers['Content-Type'] === "application/json" &&
                typeof data === 'object') {
                data = JSON.stringify(data);
            }

            // write the head
            this.response.writeHead(status, headers);
            this.response.end(data);

        });

    }

    /**
     * Pipe a readable stream to the response
     * @param stream 
     * @param statusCode 
     * @param headers 
     */
    pipe(stream: ReadStream, statusCode?: number, headers?: OutgoingHttpHeaders) {

        if(this.responseSent) {
            console.warn('Response already sent');
            return;
        }

        // default status code 200 if none provided
        let status = statusCode || 200;

        // merge defaults with provided headers
        headers = ObjectUtils.extend({}, DEFAULT_OUTGOING_HEADERS, headers);

        // let the user modify some headers
        return this.emit('response', this, headers).then(() => {

            // write the http headers
			this.response.writeHead(status, headers);

            // pipe the stream to the response object
            stream.pipe(this.response);

        });

    }

     /**
     * Sends a redirect header
     * @param location The url to redirect to
     * @param permanent Wheter this is meant to be a permanent redirection (301 vs 302)
     */
    redirect(location: string, permanent?: boolean) {

        // create a headers object
        const headers: OutgoingHttpHeaders = ObjectUtils.extend({}, DEFAULT_OUTGOING_HEADERS);

        // emit response event before redirecting
        return this.emit('response', this, headers).then(() => {

            this.response.writeHead(permanent === true ? 301 : 302, {
                'Location': location
            });

            this.response.end();

        });
    }
    

}




/**
 * @private
 * @param req 
 */
function ParseUrl(req: IncomingMessage) {

    let uri = UrlParse(req.url, true);

    let host_parts = req.headers.host ? req.headers.host.split(':') : [null, null];
    let host = host_parts[0];
    let port = host_parts[1];

    uri.protocol = (req.connection instanceof TLSSocket) ? 'https:' : 'http:';
    uri.host = req.headers.host;
    uri.hostname = host;
    uri.port = port;

    return uri;
}

/**
 * @private
 * @param req 
 */
function GetClientIp(req: IncomingMessage): string {

    let header: string = Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : '';
    return header.split(',')[0] || req.connection.remoteAddress;
}




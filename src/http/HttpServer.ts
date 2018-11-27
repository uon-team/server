

import { Injectable, Inject, Optional, EventSource, Injector, Provider, InjectionToken } from '@uon/core';
import { Server, IncomingMessage, ServerResponse } from 'http';
import * as https from 'https';
import * as tls from 'tls';
import { Socket } from 'net';
import { parse as ParseUrl } from 'url';


import { HttpConfig, HTTP_CONFIG } from './HttpConfig';
import { HttpContext } from './HttpContext';
import { HttpError } from './HttpError';
import { HTTP_ROUTER, HTTP_REDIRECT_ROUTER, MatchMethodFunc, HttpRoute } from './HttpRouter';
import { Log } from '../log/Log';
import { Router } from '@uon/router';




/**
 * Access log provider token
 */
export const HTTP_ACCESS_LOG = new InjectionToken<Log>("Access log for http requests");

/**
 * SSL Certificate provider token
 */
export const HTTP_SSL_PROVIDER = new InjectionToken<HttpSSLProvider>("Provider for SSL certificates");


/**
 * Interface to implement for for providing ssl certificates
 */
export interface HttpSSLProvider {

    /**
     * Get the tls secure context for a given domain, used for SNICallback
     * @param domain 
     */
    getSecureContext(domain: string): Promise<tls.SecureContext>;

    /**
     * Fetch the default cert and key
     */
    getDefault(): Promise<{ key: any, cert: any }>;

}


/**
 * Override for handling request
 */
interface RequestOverrides {
    method?: string;
    providers?: Provider[];
    context?: HttpContext;
}

const EMPTY_OBJECT = {};

const ROUTER_MATCH_FUNCS = [MatchMethodFunc];

/**
 * 
 */
@Injectable()
export class HttpServer extends EventSource {

    private _started: boolean;

    private _http: Server;
    private _https: https.Server;

    constructor(@Inject(HTTP_CONFIG) private config: HttpConfig,
        @Optional() @Inject(HTTP_SSL_PROVIDER) private sslProvider: HttpSSLProvider,
        @Optional() @Inject(HTTP_ACCESS_LOG) private accessLog: Log,
        private injector: Injector) {

        super();

    }

    /**
     * Whether the server is listening or not
     */
    get listening(): boolean {
        return this._started;
    }

    /**
     * Access to the plain http server 
     */
    get http() {
        return this._http;
    }

    /**
     * Access to the secure http server, if available
     */
    get https() {
        return this._https;
    }

    /**
     * Start listening to incoming messages
     */
    start(): Promise<any> {

        // maybe we already started this thing, we should let the user know
        if (this._started) {
            throw new Error('HttpServer already started');
        }

        // set the started flag to true right away
        this._started = true;


        // create plain http server
        this.spawnHttpServer();


        // if an SSL provider is defined, create an https server
        if (this.sslProvider) {

            return this.spawnHttpsServer()
                .then(() => {
                    return this;
                });

        }
        else {


        }

        return Promise.resolve(this);
    }


    /**
     * Add an event listener that will be called on every request
     */
    on(type: 'request', callback: (context: HttpContext) => any, priority?: number): void;

    /**
     * Add an event listener that will be called when an HttpError occurs
     */
    on(type: 'error', callback: (context: HttpContext, error: HttpError) => any, priority?: number): void;



    /**
     * Adds an event listener
     * @param type 
     * @param callback 
     */
    on(type: string, callback: (...args: any[]) => any, priority: number = 100) {
        return super.on(type, callback, priority);
    }

    /**
     * Spawns a plain http server (for dev or redirect to https)
     */
    private spawnHttpServer() {

        // create a plain http server
        this._http = new Server(this.sslProvider ?
            this.handleHttpsRedirect.bind(this) :
            this.handleRequest.bind(this));

        // start listening right away
        this._http.listen(this.config.plainPort, this.config.host, (err: Error) => {
            if (err) {
                throw err;
            }
            console.log(`HTTP server listening on ${this.config.host}:${this.config.plainPort}`);
        });

        // bind upgrade only if sslProvider is not defined
        if (!this.sslProvider) {
            this._http.on('upgrade', this.handleConnectionUpgrade.bind(this));
        }
    }

    /**
     * (Re)spawns an https server
     */
    private spawnHttpsServer() {

        let chain = Promise.resolve();

        // shutdown the current server if it exists
        if (this._https) {
            chain = chain.then(() => {
                return new Promise<void>((resolve) => {
                    this._https.close(() => {
                        this._https = null;
                        resolve();
                    });
                })
            });
        }

        // proceed to create a new one
        chain = chain.then(() => {

            // get the default cert and key
            return this.sslProvider.getDefault()
                .then((d) => {

                    // create ssl options for the servers
                    const ssl_options: https.ServerOptions = {
                        SNICallback: (domain, cb) => {
                            this.sslProvider.getSecureContext(domain)
                                .then((context) => {
                                    cb(!context ? new Error(`No certificate for ${domain}`) : null, context);
                                });

                        },
                        key: d.key,
                        cert: d.cert
                    };

                    // create the https server
                    this._https = https.createServer(ssl_options, this.handleRequest.bind(this));

                    return new Promise<void>((resolve, reject) => {

                        // listen to incoming connections
                        this._https.listen(this.config.port, this.config.host, (err: Error) => {
                            if (err) {
                                return reject(err);
                            }

                            resolve();
                            console.log(`HTTPS server listening on ${this.config.host}:${this.config.port}`);
                        });

                        // listen to upgrade event
                        this._https.on('upgrade', this.handleConnectionUpgrade.bind(this));

                    });


                });
        });

        return chain;
    }

    /**
     * Handle a request
     * @param req 
     * @param res 
     */
    private async handleRequest(req: IncomingMessage, res: ServerResponse) {

        // the time the handling of the request started
        const current_time = Date.now();

        // fetch the root http router
        const router: Router<HttpRoute> = this.injector.get(HTTP_ROUTER);

        // create a new context
        const http_context = new HttpContext({
            injector: this.injector,
            providers: this.config.providers,
            req: req,
            res: res
        });

        const pathname = ParseUrl(req.url, false).pathname;
        const method = req.method;

        // get match
        const match = router.match(pathname, { method }, ROUTER_MATCH_FUNCS);

        // try processing it
        try {

            // emit the request event first
            await this.emit('request', http_context);

            // process the match
            await http_context.process(match);

            // make sure a response was sent
            if (!http_context.response.sent) {
                console.error(`Controller ${match.controller.name}.${match.handler.methodKey} did not provide a response.`);
                throw new HttpError(501);
            }
        }
        catch (ex) {

            // must be HttpError from this point
            let error = ex instanceof HttpError
                ? ex
                : new HttpError(500, ex);

            // fire up the error event
            await this.emit('error', http_context, error);

            // process the error on the context 
            await http_context.processError(match, error);

  
            // last chance was given to respond
            if (!http_context.response.sent) {

                // respond with a plain text error
                http_context.response.statusCode = error.code;
                http_context.response.send(error.message);
                
            }



        }

        // log
        if (this.accessLog) {

            const res = http_context.response;
            const req = http_context.request;

            const time_ms = `${Date.now() - current_time}ms`;

            this.accessLog.log(
                res.statusCode,
                req.method,
                req.uri.path,
                req.clientIp,
                time_ms,
                process.pid);

        }

    }

    /**
     * Handle the http to https redirect
     */
    private handleHttpsRedirect(req: IncomingMessage, res: ServerResponse) {

        // fetch the redirect http router
        const router: Router<HttpRoute> = this.injector.get(HTTP_REDIRECT_ROUTER);

        // get matches
        const matches = router.match(ParseUrl(req.url, false).pathname, { method: req.method }, ROUTER_MATCH_FUNCS);

        // create a new context
        const http_context = new HttpContext({
            injector: this.injector,
            providers: this.config.providers,
            req: req,
            res: res
        });

        http_context.process(matches)
            .catch((ex: HttpError) => {

                // always redirect on error
                const new_url = 'https://' + req.headers.host + req.url;
                res.writeHead(301, { Location: new_url });
                res.end();

            });

    }

    /**
     * Handles http upgrade request
     * @param req 
     * @param socket 
     * @param head 
     */
    private async handleConnectionUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {

        // fetch the root http router
        const router: Router<HttpRoute> = this.injector.get(HTTP_ROUTER);

        // create context
        const context = new HttpContext({
            injector: this.injector,
            providers: this.config.providers,
            req,
            res: null,
            head
        });

        const pathname = ParseUrl(req.url, false).pathname;
        const method = "UPGRADE";

        // get match
        const match = router.match(pathname, { method }, ROUTER_MATCH_FUNCS);

        try {
            // process the match
            await context.process(match);
        }
        catch (ex) {

            let error = ex instanceof HttpError
                ? ex
                : new HttpError(500, ex);

            context.abort(error.code, error.message);
        }

    }

}
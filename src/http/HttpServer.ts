

import { Injectable, Inject, Optional, EventSource, Injector, ModuleRef, Router, RouteMatch, Provider, InjectionToken } from '@uon/core';
import { Server, IncomingMessage, ServerResponse } from 'http';
import * as https from 'https';
import * as tls from 'tls';

import { HttpConfig, HTTP_CONFIG } from './HttpConfig';
import { LetsEncryptService } from '../letsencrypt/LetsEncryptService';
import { HttpContext } from './HttpContext';
import { HttpError } from './HttpError';
import { HTTP_ROUTER, HttpRouter } from './HttpRouter';
import { Log } from '../log/Log';


/**
 * Access log provider token
 */
export const HTTP_ACCESS_LOG = new InjectionToken<Log>("Access log for http requests");

/**
 * SSL Certificate provider token
 */
export const HTTP_SSL_PROVIDER = new InjectionToken<HttpSSLProvider>("Provider for SSL certificates");


export interface HttpSSLProvider {

}

/**
 * 
 */
@Injectable()
export class HttpServer extends EventSource {


    private _started: boolean;

    private _http: Server;
    private _https: https.Server;


    constructor(@Inject(HTTP_CONFIG) private config: HttpConfig,
        @Optional() private letsencrypt: LetsEncryptService,
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


        // create a plain http server
        this._http = new Server(this.letsencrypt ?
            this.handleHttpsRedirect.bind(this) :
            this.handleRequest.bind(this));

        // start listening right away
        this._http.listen(this.config.plainPort, this.config.host, (err: Error) => {
            if (err) {
                throw err;
            }
            console.log(`HTTP server listening on ${this.config.host}:${this.config.plainPort}`);
        });


        // if let's encrypt is defined, create an https server
        if (this.letsencrypt) {

            // get certificates from the service
            return this.letsencrypt.getCertificates()
                .then((certs) => {

                    // build the secure context map by domain
                    const secure_contexts: any = {};
                    certs.forEach((c) => {
                        secure_contexts[c.domain] = tls.createSecureContext({
                            key: c.key,
                            cert: c.cert
                        });
                    });

                    // define the ssl options
                    const ssl_options: https.ServerOptions = {
                        SNICallback: (domain, cb) => {
                            cb(!secure_contexts[domain] ? new Error(`No certificate for ${domain}`) : null, secure_contexts[domain]);
                        },
                        key: certs[0].key,
                        cert: certs[0].cert
                    };

                    // create the https service
                    this._https = https.createServer(ssl_options, this.handleRequest.bind(this));

                    // listen to incoming connections
                    this._https.listen(this.config.port, this.config.host, (err: Error) => {
                        if (err) {
                            throw err;
                        }

                        console.log(`HTTPS server listening on ${this.config.host}:${this.config.port}`);
                    });

                    return this;

                });

        }

        return Promise.resolve(this);
    }


    /**
     * Add an event listener that with be called on every request
     */
    on(type: 'request', callback: (context: HttpContext) => any, priority?: number): void;

    /**
     * Add an event listener that with be called when an HttpError occurs
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
     * Handle a request
     * @param req 
     * @param res 
     */
    private handleRequest(req: IncomingMessage, res: ServerResponse) {

        const current_time = Date.now();

        // shortcut to config
        const config = this.config;

        // fetch the root http router
        const router: Router<HttpRouter> = this.injector.get(HTTP_ROUTER);

        // create a new context
        const http_context = new HttpContext({
            injector: this.injector,
            providers: this.config.providers,
            router: router,
            req: req,
            res: res
        });

        // check if we need to force the domain
        if (this.config.forceDomain) {

            if (http_context.uri.hostname !== config.forceDomain) {
                var new_url = http_context.uri.protocol + '//' + config.forceDomain + (http_context.uri.port ? ':' + http_context.uri.port : '') + req.url;
                res.writeHead(301, { Location: new_url });
                res.end();
                return;
            }
        }

        // emit the request event first
        return this.emit('request', http_context)
            .then(() => {

                // let the context process the request
                return http_context.process();

            })
            .catch((ex: HttpError) => {

                // emit error event
                return this.emit('error', http_context, ex).then(() => {

                    // final chance was given, respond with whatever error we got
                    // this is to avoid having a dangling connection that will eventually timeout
                    if (!http_context.response.sent) {
                        //console.error(ex)
                        http_context.response.statusCode = ex.code || 500;
                        return http_context.response.send(ex.body || ex.message);

                    }

                });


            }).then(() => {

                // all done
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

            });

    }

    /**
     * Handle the http to https redirect and the Let's Encrypt http-01 challenge
     */
    private handleHttpsRedirect(req: IncomingMessage, res: ServerResponse) {

        // if let's encrypt service is defined, listen in on the challenge
        /*if (this.letsencrypt && req.url.indexOf('.well-known/acme-challenge') !== -1) {
            return this.letsencrypt.handleChallengeRequest(req, res);
        }*/

        var new_url = 'https://' + req.headers.host + req.url;
        res.writeHead(301, { Location: new_url });
        res.end();

    }

}
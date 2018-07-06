

import { Injectable, Inject, Optional, EventSource, Injector, ModuleRef, Router, RouteMatch, Provider } from '@uon/core';
import { Server, IncomingMessage, ServerResponse } from 'http';
import * as https from 'https';
import * as tls from 'tls';
import { setTimeout } from 'timers';

import { HttpConfig, HTTP_CONFIG } from './HttpConfig';
import { LetsEncryptService } from '../letsencrypt/LetsEncryptService';
import { LogService } from '../log/LogService';
import { HttpContext } from './HttpContext';
import { HttpError } from './HttpError';
import { HttpCookies } from './HttpCookies';
import { HttpCache } from './HttpCache';
import { HttpRequestBody } from './HttpRequestBody';
import { HTTP_ROUTER, HttpRouter } from './HttpRouter';



@Injectable()
export class HttpServer extends EventSource {


    private _started: boolean;

    private _http: Server;
    private _https: https.Server;


    constructor( @Inject(HTTP_CONFIG) private config: HttpConfig,
        @Optional() private letsencrypt: LetsEncryptService,
        @Optional() private log: LogService,
        private injector: Injector) {

        super();

        // create a plain http server
        this._http = new Server(letsencrypt ?
            this.handleHttpsRedirect.bind(this) :
            this.handleRequest.bind(this));

        // start listening right away
        this._http.listen(config.plainPort, config.host, (err: Error) => {

            if (err) {
                throw err;
            }

            console.log(`HTTP server listening on ${config.host}:${config.plainPort}`);
        });


    }

    /**
     * Whether the server is listening or not
     */
    get listening(): boolean {
        return this._started;
    }

    get http() {
        return this._http;
    }

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

        // if let's encrypt is defined, create an https server
        if (this.letsencrypt) {

            // get certificates from the service
            return this.letsencrypt.getCertificates().then((certs) => {

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

        // shortcut to config
        const config = this.config;

        // fetch the root http router
        let router: Router<HttpRouter> = this.injector.get(HTTP_ROUTER);

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
        return this.emit('request', http_context).then(() => {

            // let the context process the request
            return http_context.process();

        }).catch((ex: HttpError) => {

            // emit error event
            return this.emit('error', http_context, ex).then(() => {

                // final chance was given, respond with whatever error we got
                // this is to avoid having a dangling connection that will eventually timeout
                if (!http_context.responseSent) {
                
                    return http_context.send(ex.body, ex.code);
                    
                }

            });


        });

    }

    /**
     * Handle the http to https redirect and the Let's Encrypt http-01 challenge
     */
    private handleHttpsRedirect(req: IncomingMessage, res: ServerResponse) {

        // if let's encrypt service is defined, listen in on the challenge
        if (this.letsencrypt && req.url.indexOf('.well-known/acme-challenge') !== -1) {
            return this.letsencrypt.handleChallengeRequest(req, res);
        }

        var new_url = 'https://' + req.headers.host + req.url;
        res.writeHead(301, { Location: new_url });
        res.end();

    }

}


import { Application, Module, InjectionToken, Injectable, Inject, Controller, Optional } from '@uon/core';


import { HttpModule } from './src/http/HttpModule';
import { HttpConfig, HTTP_CONFIG } from './src/http/HttpConfig';
import { HttpServer } from './src/http/HttpServer';
import { HttpContext } from './src/http/HttpContext';
import { HttpError } from './src/http/HttpError';

import { LetsEncryptModule } from './src/letsencrypt/LetsEncryptModule'
import { FsModule } from './src/fs/FsModule';
import { HttpCookies } from './src/http/HttpCookies';
import { HttpRequestBody, HTTP_REQUEST_BODY_CONFIG } from './src/http/HttpRequestBody';
import { HttpAuthorization } from './src/http/HttpAuthorization';
import { HttpEncoding } from './src/http/HttpEncoding';
import { LocalFsAdapter } from './src/fs/adapters/LocalFsAdapter';

import { WsModule } from './src/ws/WsModule';

import * as fs from 'fs';
import * as _path from 'path';
import { HttpRouter, HttpRoute } from './src/http/HttpRouter';


const STATIC_FILES_FS = new InjectionToken<LocalFsAdapter>("Static files");

@Injectable()
class ErrorHandler {

    constructor(private context: HttpContext) {


        context.on('error', (c, e) => {

            console.log('caught by handler', e);

            return c.send(`Got error ${e.code} with body "${e.body}"`, e.code);
        });
    }
}


/**
 * A controller can act as a catch all, so providers could be instatiated here
 */
@HttpRouter({
    path: '/api/v1',
    providers: []
})
class ApiController {

    constructor(private errorHandler: ErrorHandler
    ) {

    }


    @HttpRoute({
        //method: "GET",
        path: '/(.*)'
    })
    process() {
        console.log('API V1');
    }

}

@HttpRouter({
    path: '/',
    priority: 9999 // if nothing matched
})
class StaticFilesController {

    constructor( @Inject(STATIC_FILES_FS) private fs: LocalFsAdapter,
        private encoding: HttpEncoding,
        private context: HttpContext,
        private errorHandler: ErrorHandler) {

    }


    @HttpRoute({
        method: "GET",
        path: '/(.+\\..+)'
    })
    process(rest: string) {

        console.log('static files get', rest);


        return this.fs.stat(rest).then((stats) => {

            return this.fs.createReadStream(rest)
                .then((stream) => {
                    return this.context.pipe(stream, null, { 'Content-Type': stats.mimeType });
                });


        }).catch((err) => {

            throw new HttpError(404);
        });

        //return this.context.send('Banana');
    }

}



@Module({
    imports: [
        HttpModule.WithConfig({
            port: 4433,
            plainPort: 8888,
            providers: [
                ErrorHandler,
                /* {
                     token: HTTP_REQUEST_BODY_CONFIG,
                     value: { maxLength: 40 }
                 },*/
            ]
        }),

        WsModule.WithConfig({

        }),


        FsModule.WithConfig({
            adapters: [
                {
                    token: STATIC_FILES_FS,
                    adapter: new LocalFsAdapter({
                        basePath: _path.join(__dirname, '/test/static')
                    })
                }
            ]
        })


        /*LetsEncryptModule.WithConfig({
            account: "gab@uon.io",
            domains: ["uon.io"],
            storage: null,
            environment: "staging"
        })*/
    ],
    providers: [


    ],
    declarations: [
        ApiController,
        StaticFilesController
    ]
})
class AppModule {
    constructor(http: HttpServer) {

    }
}


let app = Application.Bootstrap(AppModule);
app.start().then(() => {
    console.log('all done');
});
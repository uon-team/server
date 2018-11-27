import { InjectionToken, Provider, ProvideInjectable } from '@uon/core';

import { HttpCache, HttpCacheConfig, HTTP_CACHE_CONFIG } from './transforms/HttpCache';
import { HttpEncoding, HttpEncodingConfig, HTTP_ENCODING_CONFIG } from './transforms/HttpEncoding';
import { HttpCookies } from './transforms/HttpCookies';
import { HttpAuthorization } from './transforms/HttpAuthorization';
import { HttpRange, HttpRangeConfig, HTTP_RANGE_CONFIG } from './transforms/HttpRange';
import { HTTP_REQUEST_BODY_CONFIG, HttpRequestBodyConfig } from './HttpRequest';
import { HttpErrorHandler, HTTP_ERROR_HANDLER, DefaultHttpErrorHandler } from './HttpErrorHandler';

// the unique http config token
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP Configuration');

/**
 * The http config options
 */
export interface HttpConfig {

    /**
     * the port to listen to on the https server, defaults to 4433
     */
    port?: number;

    /**
     * the port to listen to for non-secure http, defaults to 8080
     */
    plainPort?: number;

    /**
     * an ip/range to listen to on the host, defaults to 0.0.0.0 (everywhere)
     */
    host?: string;

    /**
     * a list of extra providers for the request-scoped injector
     */
    providers?: Provider[];

}


export const HTTP_CONFIG_DEFAULTS: HttpConfig = {
    port: 4433,
    plainPort: 8080,
    host: '0.0.0.0',
    providers: []
}


/**
 * The default provider list for the HttpContext injector
 */
export const DEFAULT_CONTEXT_PROVIDERS = Object.freeze(<Provider[]>[

    // request body support
    {
        token: HTTP_REQUEST_BODY_CONFIG,
        value: <HttpRequestBodyConfig>{
            maxLength: 1 * 1024 * 1024, // 1MB
            accept: ['*/*']
        }
    },

    // cookies support
    HttpCookies,

    // http cache service
    HttpCache,
    {
        token: HTTP_CACHE_CONFIG,
        value: <HttpCacheConfig>{
            etagStorage: {},
            expiresDelay: 60 * 60 * 1000
        }
    },

    // auth support
    HttpAuthorization,

    // encoding support
    HttpEncoding,
    {
        token: HTTP_ENCODING_CONFIG,
        value: <HttpEncodingConfig>{
            extensions: ['js', 'css'],
            storageAdapter: null
        }
    },

    // range support
    HttpRange,
    {
        token: HTTP_RANGE_CONFIG,
        value: <HttpRangeConfig>{
            maxChunkSize: 10 * 1024 * 1024, // 10MB
        }
    },

    // default error handler
    ProvideInjectable(HTTP_ERROR_HANDLER, DefaultHttpErrorHandler)

]);



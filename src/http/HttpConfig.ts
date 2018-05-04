import { InjectionToken, Provider } from '@uon/core';
import { HttpRequestBodyConfig, HttpRequestBody, HttpRequestBodyBufferFactory, HTTP_REQUEST_BODY_CONFIG } from './HttpRequestBody';
import { HttpCacheConfig, HttpCache, HTTP_CACHE_CONFIG } from './HttpCache';
import { HttpEncodingConfig, HttpEncoding } from './HttpEncoding';
import { HttpCookies } from './HttpCookies';
import { HttpAuthorization } from './HttpAuthorization';
import { HttpRange } from './HttpRange';


// the unique http config token
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP Configuration');

/**
 * The http config options
 */
export interface HttpConfig {

    // the port to listen to on the https server, defaults to 4433
    port?: number;

    // the port to listen to for non-secure http, defaults to 8080
    plainPort?: number;

    // an ip/range to listen to on the host, defaults to 0.0.0.0 (everywhere)
    host?: string;

    // if set, every request will be redirected to the specified domain, useful for forcing www prefix or the opposite
    forceDomain?: string;

    // a list of extra providers for the request-scoped injector
    providers?: Provider[];

}


export const HTTP_CONFIG_DEFAULTS: HttpConfig = {
    port: 4433,
    plainPort: 8080,
    host: '0.0.0.0',
    providers: []
}


/**
 * Get the default provider list for the Http context injector
 * @private
 * @param context 
 */
export function GetHttpContextDefaultProviders() {

    let providers: Provider[] = [

        // request body support
        HttpRequestBody,
        HttpRequestBodyBufferFactory,
        {
            token: HTTP_REQUEST_BODY_CONFIG,
            value: <HttpRequestBodyConfig>{
                maxLength: 1024 * 1024
            }
        },

        // cookies support
        HttpCookies,

        // http cache service
        HttpCache,
        {
            token: HTTP_CACHE_CONFIG,
            value: <HttpCacheConfig>{ 
                etagStorage: {}
            }
        },

        // auth support
        HttpAuthorization,

        // encoding upport
        HttpEncoding,

        // range support
        HttpRange
    ];


    return providers;

}


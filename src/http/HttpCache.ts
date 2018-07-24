
import { Inject, Injectable, InjectionToken, ObjectUtils } from '@uon/core';
import { Stats } from 'fs';
import { FileStat } from '../fs/FsAdapter';
import { OutgoingHttpHeaders } from 'http';
import { HttpRequest } from './HttpRequest';
import { HttpResponse } from './HttpResponse';
import { HttpTransform } from './HttpTransform';

// the config token
export const HTTP_CACHE_CONFIG = new InjectionToken<HttpCacheConfig>("HTTP Cache config");

// Http cache config interface
export interface HttpCacheConfig {
    etagStorage?: any;
    expiresDelay?: number;
}


export interface HttpCacheTransformOptions {

    /**
     * The number of seconds from now that the client should cache
     * the resource, without making a new request
     */
    expiresIn?: number;

    /**
     * Sets the Last-Modified header to the date specified
     */
    lastModified?: Date;
}


/**
 * Parses cache related header and generates cache headers for response
 */
@Injectable()
export class HttpCache extends HttpTransform {


    readonly ifModifiedSince: Date;
    readonly etag: string;

    private _expiresInSeconds: number;
    private _lastModified: Date;

    private _options: HttpCacheTransformOptions;


    constructor(private request: HttpRequest,
        @Inject(HTTP_CACHE_CONFIG) private config: HttpCacheConfig) {

        super();

        // check for if modified since header
        let req_date = request.headers["if-modified-since"];
        if (req_date) {
            this.ifModifiedSince = new Date(req_date as string);
        }

        // check for etag header
        let etag = request.headers["etag"];
        if (etag) {
            this.etag = etag as string;
        }

    }

    /**
     * HttpTransform configure implementation
     * @param options 
     */
    configure(options: HttpCacheTransformOptions) {
        this._options = options;

        return this;
    }

    /**
     * HttpTransform transform implementation
     * @param response 
     */
    transform(response: HttpResponse) {

        // must be configured
        if (!this._options) {
            return;
        }

        const last_modified = this._options.lastModified;

        // check if not modified, in that case we reply right away with
        if (this.ifModifiedSince && last_modified &&
            Math.floor(last_modified.getTime() / 1000) === Math.floor(this.ifModifiedSince.getTime() / 1000)
        ) {
            response.statusCode = 304;
            return response.send(null);
        }

        // set expires header
        if (this._options.expiresIn) {
            const expires = new Date(Date.now() + (this._options.expiresIn * 1000));
            response.setHeader('Expires', expires.toUTCString());
        }

        // set last-modified header
        if (last_modified) {
            response.setHeader('Last-Modified', last_modified.toUTCString());
        }

    }

}






import { Inject, Injectable, InjectionToken, ObjectUtils } from '@uon/core';
import { HttpContext } from './HttpContext';
import { Stats } from 'fs';
import { FileStat } from '../fs/FsAdapter';
import { OutgoingHttpHeaders } from 'http';


// the config token
export const HTTP_CACHE_CONFIG = new InjectionToken<HttpCacheConfig>("HTTP Cache config");

// Http cache config interface
export interface HttpCacheConfig {
    etagStorage?: any;
}


/**
 * Parses cache related header and generates cache headers for response
 */
@Injectable()
export class HttpCache {


    readonly ifModifiedSince: Date;
    readonly etag: string;

    constructor(
        private context: HttpContext,
        @Inject(HTTP_CACHE_CONFIG)
        private config: HttpCacheConfig
    ) {


        // check for if modified since header
        let req_date = context.request.headers["if-modified-since"];
        if (req_date) {
            this.ifModifiedSince = new Date(req_date as string);
        }

        // check for etag header
        let etag = context.request.headers["etag"];
        if (etag) {
            this.etag = etag as string;
        }

        context.on('response', (context, headers) => {

            if (true) { }

        })

    }

    process(stats: FileStat, headers: OutgoingHttpHeaders): number  {

        if(this.ifModifiedSince && 
            Math.floor(stats.modified.getTime() / 1000) === Math.floor(this.ifModifiedSince.getTime() / 1000)
        ) {

            ObjectUtils.extend(headers, {
                "Last-Modified": stats.modified.toUTCString()
            });

            return 304;
        }


        return 200;
    }


    /**
     * Generate an ETag from fs.Stats
     * @param stats 
     */
    generateETag(path: string, stats: Stats) {

    }


}





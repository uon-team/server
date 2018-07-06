
import { Inject, Injectable, InjectionToken } from '@uon/core';
import { HttpContext } from './HttpContext';

// Injection token for encoding config
export const HTTP_ENCODING_CONFIG = new InjectionToken<HttpEncodingConfig>("Http Encoding Config");


/**
 * Configuration for content encoding
 */
export interface HttpEncodingConfig {
    handlers?: any[];
    extensions?: string[];
    
}



@Injectable()
export class HttpEncoding {

    // the encoding methods
    readonly accept: string[];


    constructor(private context: HttpContext, 
        @Inject(HTTP_ENCODING_CONFIG) private config: HttpEncodingConfig) {

        let req = context.request;
        if (req.headers['accept-encoding']) {
            // populate the accept array
            this.accept = (req.headers['accept-encoding'] as string)
                .split(',')
                .map(s => s.trim());

        }

    }

}





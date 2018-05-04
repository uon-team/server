
import { Injectable } from '@uon/core';
import { HttpContext } from './HttpContext';


export interface HttpEncodingConfig {
    
}

@Injectable()
export class HttpEncoding {

    // the encoding methods
    readonly accept: string[];


    constructor(private context: HttpContext) {

        let req = context.request;
        if (req.headers['accept-encoding']) {
            // populate the accept array
            this.accept = (req.headers['accept-encoding'] as string)
                .split(',')
                .map(s => s.trim());

        }

    }

}





import { Inject, Injectable, InjectionToken, ObjectUtils } from '@uon/core';
import { HttpContext } from './HttpContext';
import { HttpError } from './HttpError';
import { HttpRequest } from './HttpRequest';


// Injection token for the request body raw buffer
export const HTTP_REQUEST_BODY_BUFFER = new InjectionToken<Buffer>("Http Request Body Buffer");

// Injection token for the requst body configuration
export const HTTP_REQUEST_BODY_CONFIG = new InjectionToken<HttpRequestBodyConfig>("Http Request Body Config");

// some http methods cannot have a body, we keep a list so we can ignore them
const NO_BODY_METHODS = ['DELETE', 'OPTIONS', 'GET', 'HEAD', 'COPY', 'PURGE', 'UNLOCK'];



/**
 * Configuration options for the request body
 */
export interface HttpRequestBodyConfig {

    // the maximum acceptable body size, in bytes
    maxLength?: number;

    // NOT IMPLEMENTED. which content type (mime) is accepted 
    accept?: string[];
}



/**
 * The request body interface, not injectable as we need an async factory
 * to get it started
 */
@Injectable()
export class HttpRequestBody {

    private _mime: string;
    private _data: any;

    constructor(private request: HttpRequest,
        @Inject(HTTP_REQUEST_BODY_BUFFER) private _buffer: Buffer) {

        this._mime = request.headers['content-type'];

    }


    /**
     * Access to the raw buffer
     */
    get buffer() {
        return this._buffer;
    }

    /**
     * Access to the content type
     */
    get mime() {
        return this._mime;
    }

    /**
     * Get the parsed data as key value pairs
     */
    get data(): any {
        return this._data;
    }




}


export const HttpRequestBodyBufferFactory = {

    token: HTTP_REQUEST_BODY_BUFFER,
    factory: (request: HttpRequest, config: HttpRequestBodyConfig) => {


        return new Promise<Buffer>((resolve, reject) => {

            // some http methods don't get to have a body
            if (NO_BODY_METHODS.indexOf(request.method) >= 0) {
                return resolve();
            }

            // we need a length from the headers
            let header_length_str = request.headers['content-length'];
            if (!header_length_str) {
                return reject(new HttpError(411));
            }

            // check if content-length is bigger than the max allowed body size
            let header_length = parseInt(header_length_str);
            if (header_length > config.maxLength) {
                return reject(new HttpError(413));
            }

            // start with an empty body
            let body: any[] = [];

            // append chunks to the body as they come in
            request.toReadableStream()
                .on('data', (chunk) => {

                    body.push(chunk);

                }).on('end', () => {

                    resolve(Buffer.concat(body));

                }).on('error', (err) => {

                    reject(err);

                });


        });

    },
    deps: [HttpRequest, HTTP_REQUEST_BODY_CONFIG]

};


function ParseBuffer(mime: string, buffer: Buffer) {

    if (mime === 'application/json') {
        let res: any = null;
        try {
            res = JSON.parse(buffer.toString('utf8'));
        }
        catch (ex) {
            console.error(ex);
        }
        return res;
    }

    return buffer;
}
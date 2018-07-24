
import { STATUS_CODES } from 'http'

export class HttpError extends Error {

    /**
     * The Http status code
     */
    readonly code: number;

    /**
     * The Http status code message, defaults to http.STATUS_CODES[code]
     */
    readonly message: string;

    /**
     * The body sent to the client. For dev, this is usually the error stack
     */
    readonly body: string

    /**
     * 
     * @param code 
     * @param message 
     * @param body 
     */
    constructor(code: number, message?: string, body?: string) {

        let msg = message || STATUS_CODES[code];
        super(`HttpError ${code} : ${msg}`);

        this.code = code;
        this.message = msg;
        this.body = body;
    }
}
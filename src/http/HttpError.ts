
import { STATUS_CODES } from 'http'

export class HttpError extends Error {

    readonly code: number;
    readonly message: string;
    readonly body: string

    constructor(code: number, message?: string, body?: string) {

        let msg = message || STATUS_CODES[code];
        super(`HttpError ${code} : ${msg}`);

        this.code = code;
        this.message = msg;
        this.body = body;
    }
}
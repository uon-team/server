import { Injectable, ObjectUtils } from '@uon/core';
import { HttpContext } from './HttpContext';


const SPLIT_ENTRIES = /; */;
const INVALID_CHAR_TEST = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

const DEFAULT_SET_COOKIE_OPTIONS = {
    httpOnly: true,
    session: false,
    path: '/'
};

export interface CookieSetOptions {
    expires?: Date;
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    session?: boolean;

}


@Injectable()
export class HttpCookies {

    // request cookie storage
    private _get: { [k: string]: string } = {};

    // response cookie storage
    private _set: { [k: string]: string } = {};

    /**
     * ctor
     */
    constructor(private context: HttpContext) {

        // parse incoming cookies
        this.parse();

        // write the set-cookies header on response
        context.on('response', (c, headers) => {

            // build an array of Set-Cookie strings
            let cs: string[] = [];
            for (let key in this._set) {
                cs.push(this._set[key]);

            }

            // set the header's Set-Cookie field with the array
            headers['Set-Cookie'] = cs;

        });

    }

    /**
     * Set a cookie to be written in the response
     * @param name 
     * @param value 
     * @param options 
     */
    setCookie(name: string, value: string, options?: CookieSetOptions) {

        let opts = ObjectUtils.extend({}, DEFAULT_SET_COOKIE_OPTIONS, options);
        opts.secure = this.context.secure;

        try {
            let result = this.serialize(name, value, opts);
            this._set[name] = result;
        }
        catch (ex) {
            console.warn(`Invalid set cookie ${name} = ${value}`);
        }

    }

    /**
     * Retrieve a request cookie by name
     * @param name 
     */
    getCookie(name: string): string {
        return this._get[name];
    }

    /**
     * Get all request cookies as key/value map
     */
    getCookies() {
        return this._get;
    }


    /**
     * Parse the cookies from the request
     */
    private parse() {

        let str = this.context.request.headers['cookies'] as string;
        if (!str) return;

        let pairs = str.split(SPLIT_ENTRIES);

        for (let i = 0; i < pairs.length; i++) {

            let pair = pairs[i];
            let eq_idx = pair.indexOf('=');

            // skip things that don't look like key=value
            if (eq_idx < 0) {
                continue;
            }

            let key = pair.substr(0, eq_idx).trim()
            let val = pair.substr(++eq_idx, pair.length).trim();

            // quoted values
            if ('"' == val[0]) {
                val = val.slice(1, -1);
            }

            // only assign once
            if (this._get[key] == undefined) {
                this._get[key] = decodeURIComponent(val);
            }

        }

    }

    /**
     * Serializes key, value and options
     * @param name 
     * @param val 
     * @param options 
     */
    private serialize(name: string, val: string, options: CookieSetOptions) {

        // check for invalid char in key
        if (!INVALID_CHAR_TEST.test(name)) {
            throw new Error('argument name is invalid');
        }

        // url encode the value
        let value = encodeURIComponent(val);

        // check for invalid chars in value
        if (!INVALID_CHAR_TEST.test(value)) {
            throw new Error('value is invalid');
        }

        let result = name + '=' + value;


        if (options.maxAge) {
            result += '; Max-Age=' + Math.floor(options.maxAge);
        }

        if (options.expires) {
            result += `; Expires=${options.expires.toUTCString()}`;
        }

        if (options.httpOnly) {
            result += '; HttpOnly';
        }

        if (options.secure) {
            result += '; Secure';
        }

        if (options.path) {
            result += `; Path=${options.path}`;
        }

        if (options.domain) {
            result += `; Domain=${options.domain}`;
        }


        return result;
    }
}
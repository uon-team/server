
import { Injectable } from '@uon/core';
import { HttpTransform } from './HttpTransform';
import { HttpResponse } from './HttpResponse';



export interface ContentSecurityPolicyOptions {


    /** 
     * The fallback for all other *-src directive. Value can be: 
     * - url : http://*.example.com
     * - schema: https: or http:
     */
    defaultSrc: string;

    scriptSrc: string;

    imageSrc: string;

    objectSrc: string;

    styleSrc: string;



    /**
     * In case of a CSP violation, the browser (if implemented) will send a report 
     * to this URI. Sets the report-uri and report-to directives
     */
    reportUri?: string;


    /**
     * Use the Content-Security-Policy-Report-Only header name instead
     */
    reportOnly?: boolean;


}


export interface HttpSecurityConfigureOptions {

    /**
     * Whether the response should set "x-frame-options: SAMEORIGIN" in headers
     * Setting this to true will prevent other sites from loading the resource with an iframe
     */
    noIFrames?: boolean;

    /**
     * Whether the response should set "x-xss-protection: 1; mode=block" in headers
     */
    xssProtection?: boolean;

    /**
     * Content-Security-Policy options to set in headers
     */
    csp?: ContentSecurityPolicyOptions

}


/**
 * Implements security headers
 */
@Injectable()
export class HttpSecurity extends HttpTransform {

    private _options: HttpSecurityConfigureOptions;

    constructor() {
        super();
    }

    configure(options: HttpSecurityConfigureOptions) {
        this._options = options;
        return this;
    }

    transform(response: HttpResponse) {

        if(!this._options) {
            return;
        }

        if(this._options.noIFrames) {
            response.setHeader('X-Frame-Options', 'SAMEORIGIN');
        }

        if(this._options.xssProtection) {
            response.setHeader('X-XSS-Protection', '1; mode=block');
        }

    }
}
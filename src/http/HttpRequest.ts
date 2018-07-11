import { IncomingMessage, IncomingHttpHeaders } from "http";
import { Url, parse as UrlParse } from "url";
import { TLSSocket } from "tls";




export class HttpRequest {

    private _uri: Url;

    constructor(private _request: IncomingMessage) {

        this._uri = ParseUrl(_request);
    }

    /**
     * Whether the connection is secure or not (over https)
     */
    get secure(): boolean {
        return (this._request.connection instanceof TLSSocket);
    }

    /**
     * The http method used for the request
     */
    get method() {
        return this._request.method;
    }

    /**
     * The decomposed request url
     */
    get uri() {
        return this._uri;
    }

    /**
     * The http version
     */
    get httpVersion() {
        return this._request.httpVersion;
    }

    /**
     * The request header map
     */
    get headers() {
        return this._request.headers;
    }

    toReadableStream() {
        return this._request;
    }


}


/**
 * @private
 * @param req 
 */
function ParseUrl(req: IncomingMessage) {

    let uri = UrlParse(req.url, true);

    let host_parts = req.headers.host ? req.headers.host.split(':') : [null, null];
    let host = host_parts[0];
    let port = host_parts[1];

    uri.protocol = (req.connection instanceof TLSSocket) ? 'https:' : 'http:';
    uri.host = req.headers.host;
    uri.hostname = host;
    uri.port = port;

    return uri;
}
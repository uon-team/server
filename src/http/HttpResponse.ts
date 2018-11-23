import { OutgoingMessage, OutgoingHttpHeaders, ServerResponse } from "http";
import { Writable, Stream, Readable } from "stream";
import { HttpTransform } from "./transforms/HttpTransform";



/**
 * Interface for manipulation the server response
 */
export class HttpResponse {

    private _transforms: HttpTransform[] = [];
    private _inputStream: Stream;

    private _statusCode: number = 200;
    private _headers: OutgoingHttpHeaders = {};

    /**
     * Creates a new server response wrapper
     * @param _response 
     */
    constructor(private _response: ServerResponse) { }

    /**
     * Whether the headers were sent
     */
    get sent() {
        return this._response
            ? this._response.headersSent || this._response.finished
            : true;
    }

    /**
     * The status code that will be sent with headers
     */
    get statusCode() {
        return this._statusCode;
    }

    /**
     * Sets the status code for the response
     */
    set statusCode(val: number) {
        this._statusCode = val;
    }

    /**
     * Get the header map that will be sent
     */
    get headers() {
        return this._headers;
    }

    /**
     * Sets a header by name
     * @param name 
     * @param value 
     */
    setHeader(name: string, value: string | string[] | number) {

        this._headers[name] = value;
        return this;
    }

    /**
     * Get a previously set header by name
     * @param name 
     */
    getHeader(name: string) {
        return this._headers[name];
    }

    /**
     * Set multiple headers, replacing the ones set previously
     * @param headers 
     */
    assignHeaders(headers: OutgoingHttpHeaders) {
        Object.assign(this._headers, headers);
    }


    /**
     * Sends some data and finalize the server response 
     */
    send(data: Buffer | string | null) {
        this._response.writeHead(this._statusCode, this._headers);
        this._response.end(data);
    }

    /**
     * Sends a redirect header
     * @param location The url to redirect to
     * @param permanent Whether this is meant to be a permanent redirection (301 vs 302)
     */
    redirect(location: string, permanent?: boolean) {

        this._response.writeHead(permanent === true ? 301 : 302, {
            'Location': location
        });

        this._response.end();

    }

    /**
     * Sets the data input stream
     * @param readable 
     */
    stream(readable: Stream) {
        this._inputStream = readable;
    }

    /**
     * Use a transform in the pipeline
     * @param transform 
     */
    use(...transforms: HttpTransform[]) {
        this._transforms.push(...transforms);
    }


    /**
     * Executes the pipeline until a response is sent
     */
    async finish() {


        for(let i = 0; i < this._transforms.length; ++i) {

            if(this.sent) {
                return;
            }

            await this._transforms[i].transform(this);

        }

        // finally send the response if an input stream is set
        if (this._inputStream) {

            this._response.writeHead(this._statusCode, this._headers);
            this._inputStream.pipe(this._response);
        }


    }


}
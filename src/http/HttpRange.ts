
import { Inject, Injectable, InjectionToken, ObjectUtils } from '@uon/core';
import { HttpContext } from './HttpContext';
import { FileStat } from '../fs/FsAdapter';
import { OutgoingHttpHeaders } from 'http';
import { HttpError } from './HttpError';


// Injection token for range config
export const HTTP_RANGE_CONFIG = new InjectionToken("Http Range Config");


/**
 * Range config interface
 */
export interface HttpRangeConfig {

    // the maximum chunk size in bytes 
    maxChunkSize: number;

}

/**
 * Parses Range headers 
 */
@Injectable()
export class HttpRange {

    private _start: number;
    private _end: number;

    private _acceptRangeRequest: boolean = false;
    private _chunkSize: number;
    private _totalSize: number;


    /**
     * Create an interface to manipulate range and parse the range headers
     * @param context 
     * @param config 
     */
    constructor(private context: HttpContext,
        @Inject(HTTP_RANGE_CONFIG) private config: HttpRangeConfig) {

        let req = this.context.request;
        let range_str = req.headers.range as string;

        if (range_str) {
            let positions = range_str.replace(/bytes=/, "").split("-");
            this._start = parseInt(positions[0], 10);
            this._end = positions[1] ? parseInt(positions[1], 10) : undefined;
        }


        // set headers on response
        context.on('response', (c, headers) => {


        });

    }

    /**
     * The requested range
     */
    get range() {
        return { start: this._start, end: this._end };
    }

    /**
     * Set whether or not to accept range request
     */
    set accept(val: boolean) {
        this._acceptRangeRequest = val;
    }

    /**
     * Accepts further range requests
     */
    get accept(): boolean {
        return this._acceptRangeRequest;
    }

    /**
     * The total file size
     */
    set totalSize(val: number) {
        this._totalSize = val;
    }


    process(stats: FileStat, headers: OutgoingHttpHeaders): number {

        if (this._start !== undefined) {

            this._end = Math.min(this._start + this.config.maxChunkSize, this._end || stats.size - 1);

            if (this._end >= stats.size) {
                throw new HttpError(416);
            }

            // compute the chunk size
            let chunk_size = (this._end - this._start) + 1;

            // if the chunk is actually the full file size, just return 200
            if (chunk_size === stats.size) {
                return 200;
            }

            // we are sending a a byte range, set the headers
            ObjectUtils.extend(headers, {
                "Content-Length": chunk_size,
                "Content-Range": `bytes ${this._start}-${this._end}/${stats.size}`,
                "Accept-Ranges": "bytes"
            });

            // with status code 206 (partial content)
            return 206;
        }

        // nothing to do
        return 200;
    }

}

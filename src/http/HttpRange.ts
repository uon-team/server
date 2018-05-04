
import { Injectable, ObjectUtils } from '@uon/core';
import { HttpContext } from './HttpContext';
import { FileStat } from '../fs/FsAdapter';
import { OutgoingHttpHeaders } from 'http';
import { HttpError } from './HttpError';


const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * TODO
 */
@Injectable()
export class HttpRange {

    private _start: number;
    private _end: number;

    constructor(private context: HttpContext) {

        let req = this.context.request;
        let range_str = req.headers.range as string;

        if (range_str) {
            let positions = range_str.replace(/bytes=/, "").split("-");
            this._start = parseInt(positions[0], 10);
            this._end = positions[1] ? parseInt(positions[1], 10) : undefined;
        }

    }

    get range() {
        return { start: this._start, end: this._end };
    }


    process(stats: FileStat, headers: OutgoingHttpHeaders): number {

        if (this._start !== undefined) {

            this._end = Math.min(this._start + MAX_CHUNK_SIZE, this._end || stats.size - 1);

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


import * as _path from 'path';
import * as fs from 'fs';
import { Readable, Writable } from 'stream';
import { GetMimeType, SanitizePath } from '../FsUtils';

import { FsAdapter, FileStat } from '../FsAdapter';
import { OutgoingHttpHeaders } from 'http';
import { Url, parse as UrlParse } from 'url';


const DEFAULT_REQUEST_HEADERS = {
    'User-Agent': `uon/1.0.0`
};


export interface HttpFsConfig {

    /**
     * The path on the local file system from which
     * all given paths are relative
     */
    baseUrl: string;

    /**
     * The headers to send with each request
     */
    headers?: OutgoingHttpHeaders

}

/**
 * FsAdapter implementation for http (WebDAV) file access.
 *  
 * Paths are always relative to the base url, 
 * and the base path is the absolute root dir. Cannot use ../
 */
export class HttpFsAdapter implements FsAdapter {


    private _url: Url;

    constructor(private config: HttpFsConfig) {

        this._url = UrlParse(this.config.baseUrl);

    }

    createReadStream(path: string, options?: any): Readable {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));

        return fs.createReadStream(filepath, options);

    }

    createWriteStream(path: string, options?: any): Writable {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));


        return fs.createWriteStream(filepath, options);

    }

    read(path: string): Promise<Buffer> {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));

        return new Promise((resolve, reject) => {

            fs.readFile(filepath, (err, data) => {

                if (err) {
                    return reject(err);
                }

                resolve(data);

            });

        });
    }

    write(path: string, data: Buffer): Promise<FileStat> {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));

        return new Promise((resolve, reject) => {

            // write the file
            fs.writeFile(filepath, data, (err) => {

                if (err) {
                    return reject(err);
                }

                resolve({
                    name: path,
                    modified: new Date(),
                    url: filepath
                });

            });

        });
    }


    delete(path: string): Promise<boolean> {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));

        return new Promise((resolve, reject) => {

            fs.unlink(filepath, (err) => {

                if (err) {
                    return reject(err);
                }

                resolve(true);

            });

        });
    }

    stat(path: string): Promise<FileStat> {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));

        return new Promise((resolve, reject) => {

            fs.stat(filepath, (err, stats) => {

                if (err) {
                    return reject(err);
                }

                let mime = GetMimeType(path);
                let ext = _path.extname(path).substr(1);

                resolve({
                    modified: stats.mtime,
                    created: stats.ctime,
                    size: stats.size,
                    mimeType: mime ? mime as string : undefined,
                    ext: ext ? ext as string : undefined,
                    url: filepath,
                    path: path,
                    name: _path.basename(path)
                });

            });

        });
    }

    list(path: string): Promise<FileStat[]> {

        const filepath = _path.join(this.config.baseUrl, SanitizePath(path));


        return new Promise((resolve, reject) => {

            fs.readdir(filepath, (err, files) => {

                if (err) {
                    return reject(err);
                }

                let promises: Promise<FileStat>[] = [];


                for (let i = 0; i < files.length; ++i) {

                    let relpath = _path.join(path, files[i]);

                    promises.push(this.stat(relpath));

                }

                resolve(Promise.all(promises));

            });

        });

    }

    private createRequest(method: string, path: string) {

    }


}

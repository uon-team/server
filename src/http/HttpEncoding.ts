
import { Inject, Injectable, InjectionToken } from '@uon/core';
import { FsAdapter, FileStat } from '../fs/FsAdapter';
import { OutgoingHttpHeaders } from 'http';
import { gzip, createGzip } from 'zlib';
import { HttpRequest } from './HttpRequest';
import { HttpResponse } from './HttpResponse';
import { HttpTransform } from './HttpTransform';
import { Readable } from 'stream';
import { extname } from 'path';

// Injection token for encoding config
export const HTTP_ENCODING_CONFIG = new InjectionToken<HttpEncodingConfig>("Http Encoding Config");


/**
 * Configuration for content encoding
 */
export interface HttpEncodingConfig {
    //handlers: any[];
    extensions: string[];
    storageAdapter: FsAdapter;

}

export interface HttpEncodingConfigureOptions {
    srcAdapter?: FsAdapter;
    srcPath?: string;
}



@Injectable()
export class HttpEncoding extends HttpTransform {

    // the encoding methods
    readonly accept: string[];

    private _options: HttpEncodingConfigureOptions;


    constructor(private request: HttpRequest, private response: HttpResponse,
        @Inject(HTTP_ENCODING_CONFIG) private config: HttpEncodingConfig) {

        super();

        if (request.headers['accept-encoding']) {
            // populate the accept array
            this.accept = (request.headers['accept-encoding'] as string)
                .split(',')
                .map(s => s.trim());

        }

    }

    configure(options: HttpEncodingConfigureOptions) {
        this._options = options;
    }

    transform(response: HttpResponse) {

        // must be configured
        if (!this._options) {
            return;
        }

        const src_adapter = this._options.srcAdapter;
        const src_path = this._options.srcPath;

        if (src_adapter && src_path) {

            if (this.accept.indexOf('gzip') === -1 ||
                this.config.extensions.indexOf(extname(src_path).substr(1)) === -1) {
                return;
            }

            return src_adapter.stat(src_path)
                .then((srcStats) => {

                    const dest_adapter = this.config.storageAdapter;
                    const dest_path = `${this._options.srcPath}.gz.${Math.floor(srcStats.modified.getTime() / 1000)}`;

                    let final_stats: FileStat;

                    return dest_adapter.stat(dest_path)
                        .then((destStats) => {

                            final_stats = destStats;
                            return dest_adapter.createReadStream(dest_path);

                        })
                        .catch((err) => {

                            return new Promise<Readable>((resolve, reject) => {

                                src_adapter.createReadStream(src_path)
                                    .pipe(createGzip())
                                    .pipe(dest_adapter.createWriteStream(dest_path))
                                    .on('finish', () => {

                                        dest_adapter.stat(dest_path)
                                            .then((destStats) => {
                                                final_stats = destStats;
                                                resolve(dest_adapter.createReadStream(dest_path))
                                            });


                                    })
                                    .on('error', (err) => {
                                        reject(err);
                                    });
                            });

                        })
                        .then((stream) => {

                            response.setHeader('Content-Encoding', 'gzip');
                            response.setHeader('Content-Length', final_stats.size);
                            response.setInputSteam(stream);
                        });

                });

        }



    }



}





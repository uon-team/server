
import * as _path from 'path';
import * as fs from 'fs';
import * as mime_types from 'mime-types';

import { FsAdapter, FileStat } from '../FsAdapter';
import { ReadStream } from 'fs';



export interface LocalFsConfig {
    basePath: string;
    forceDirCreationOnWrite?: boolean;
}

/**
 * Interface for local file system access, 
 * paths a always relative to the base path, 
 * and the base path is the absolute root dir. Cannot use ../
 */
export class LocalFsAdapter implements FsAdapter {


    constructor(private config: LocalFsConfig) {

    }

    createReadStream(path: string, options?: any): Promise<ReadStream> {

        let filepath = _path.join(this.config.basePath, SanitizePath(path));

        
        return new Promise((resolve, reject) => {

            let stream = fs.createReadStream(filepath, options)
                .on('open', () => {

                    resolve(stream);

                })
                .on('error', (err) => {

                    reject(err);
                });
        });

    }

    read(path: string): Promise<Buffer> {

        let filepath = _path.join(this.config.basePath, SanitizePath(path));

        return new Promise((resolve, reject) => {

            fs.readFile(filepath, (err, data) => {

                if (err) {
                    reject(err);
                }

                resolve(data);

            });

        });
    }

    write(path: string, data: Buffer): Promise<FileStat> {

        var filepath = _path.join(this.config.basePath, SanitizePath(path));

        return new Promise((resolve, reject) => {

            // make sure dir exists if config permits it
            if (this.config.forceDirCreationOnWrite) {
                EnsureDirectoryExistence(filepath);
            }

            // write the file
            fs.writeFile(filepath, data, (err) => {

                if (err) {
                    reject(err);
                }

                resolve({
                    name: path,
                    modified: new Date(),
                    url: path
                });

            });

        });
    }


    delete(path: string): Promise<boolean> {

        var filepath = _path.join(this.config.basePath, SanitizePath(path));

        return new Promise((resolve, reject) => {

            fs.unlink(filepath, (err) => {

                if (err) {
                    reject(err);
                }

                resolve(true);

            });

        });
    }

    stat(path: string): Promise<FileStat> {

        var filepath = _path.join(this.config.basePath, SanitizePath(path));

        return new Promise((resolve, reject) => {

            fs.stat(filepath, (err, stats) => {

                if (err) {
                    return reject(err);
                }

                let mime = mime_types.lookup(path);
                let ext = mime ? mime_types.extension(mime as string) : false;

                resolve({
                    modified: stats.mtime,
                    created: stats.ctime,
                    size: stats.size,
                    mimeType: mime ? mime as string : undefined,
                    ext: ext ? ext as string : undefined
                });

            });

        });
    }


}

function EnsureDirectoryExistence(filePath: string) {
    var dirname = _path.dirname(filePath);

    if (fs.existsSync(dirname)) {
        return true;
    }

    EnsureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);

}

function SanitizePath(path: string) {


    return path.replace(/[\x00-\x1f\x80-\x9f]/g, '').replace(/\.+\//g, '');
        

}
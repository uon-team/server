import { LockAdapter } from "../LockAdapter";

import * as fs from 'fs'
import * as os from 'os';
import * as path from 'path';

export class FileLockAdapter implements LockAdapter {


    private _locks: string[] = [];

    private _terminated: boolean;

    constructor(private basePath: string = os.tmpdir()) {

    }

    lock(token: string, unique?: boolean) {

        if (this._locks.indexOf(token) > -1) {
            return Promise.reject(new Error(`Lock for ${token} already acquired`));
        }

        let file = this.formatFilename(token);


        try {
            fs.mkdirSync(file);
            this._locks.push(token);
            return Promise.resolve(true);
        }
        catch (err) {

            return this.waitForUnlock(file);

        }


    }

    unlock(token: string) {

        if (this._locks.indexOf(token) == -1) {
            return Promise.reject(new Error(`No locks for ${token} acquired from this process`));
        }

        try {
            fs.rmdirSync(this.formatFilename(token));
        }
        catch (err) {

        }

        this._locks = this._locks.filter(l => l != token);

        return Promise.resolve(true);

    }

    clear() {

        this._locks.forEach((l) => {

            try {
                fs.rmdirSync(this.formatFilename(l));
            }
            catch (err) {

            }

        });

        this._locks = [];

        return Promise.resolve();
    }


    private checkLock(filepath: string) {

        return new Promise<boolean>((resolve, reject) => {

            fs.exists(filepath, (res) => {

                if (this._terminated) {
                    return reject(new Error('Process termininated'));
                }
                resolve(res);
            });
        });


    }

    private waitForUnlock(file: string) {

        return new Promise<boolean>((resolve) => {

            let retry = () => {

                return this.checkLock(file)
                    .then((res) => {

                        if (res && !this._terminated) {
                            return new Promise((r) => {

                                setTimeout(() => {
                                    r(retry());
                                }, 200)
                            })
                        }

                        resolve(false);
                    });
            };

            retry();

        });


    }

    private formatFilename(token: string) {
        return path.resolve(path.join(this.basePath, `${token}.uon.lock`));
    }

}
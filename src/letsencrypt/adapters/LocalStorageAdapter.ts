import { LetsEncryptStorageAdapter } from "../StorageAdapter";
import { Certificate, Account, Challenge } from "../Models";

import * as path from 'path';
import * as fs from 'fs';


export interface LocalStorageAdapterOptions {
    baseDir: string;
}


/**
 * Storage adapter for storing Let's Encrypt accounts and certificates 
 * on the local hard disk. make sure the baseDir is not publicly accessible.
 */
export class LetsEncryptLocalStorageAdapter implements LetsEncryptStorageAdapter {

    private _accounts: string;
    private _certificates: string;
    private _challenges: string;

    constructor(options: LocalStorageAdapterOptions) {

        // make sure directories exist
        this.createDirectories(options.baseDir);

    }


    getAccount(email: string): Promise<Account> {

        let fp = path.join(this._accounts, email + '.json');

        return this.readJson(fp).then((account) => {
            return account;
        });

    }

    saveAccount(account: Account): Promise<Account> {

        let fp = path.join(this._accounts, account.email + '.json');

        return this.writeJson(fp, account).then(() => account);
    }

    getCertificate(domain: string): Promise<Certificate> {

        let fp = path.join(this._certificates, domain + '.json');

        return this.readJson(fp).then((cert: Certificate) => {

            if(cert) {
                cert.renewBy = new Date(cert.renewBy);
            }
            return cert;
        });

    }

    saveCertificate(cert: Certificate): Promise<Certificate> {

        let fp = path.join(this._certificates, cert.domain + '.json');

        return this.writeJson(fp, cert).then(() => cert);
    }

    getChallenge(token: string): Promise<Challenge> {

        let fp = path.join(this._challenges, token + '.json');

        return this.readJson(fp).then((chal) => {
            return chal;
        });
    }

    saveChallenge(challenge: Challenge): Promise<Challenge> {
        let fp = path.join(this._challenges, challenge.token + '.json');

        return this.writeJson(fp, challenge).then(() => challenge);
    }


    private createDirectories(baseDir: string) {

        this._accounts = path.join(baseDir, 'accounts');
        this._certificates = path.join(baseDir, 'certs');
        this._challenges = path.join(baseDir, 'challenges');


        if (!fs.existsSync(this._accounts)) {
            fs.mkdirSync(this._accounts);
        }

        if (!fs.existsSync(this._certificates)) {
            fs.mkdirSync(this._certificates);
        }

        if (!fs.existsSync(this._challenges)) {
            fs.mkdirSync(this._challenges);
        }


    }

    private readJson(filepath: string): Promise<any> {

        return new Promise((resolve, reject) => {

            fs.readFile(filepath, 'utf8', (err, buffer) => {

                if(err) {
                    return resolve(null);
                }

                try {
                    let obj = JSON.parse(buffer);
                    resolve(obj);
                }   
                catch(ex) {

                    console.warn(ex);
                    return resolve(null);
                }

            });


        });
    }

    private writeJson(filepath: string, obj: any): Promise<void> {

        return new Promise((resolve, reject) => {

            fs.writeFile(filepath, JSON.stringify(obj, null, 2), (err) => {

                if(err) {
                    return reject(err);
                }

                resolve();

            });


        });
    }
}
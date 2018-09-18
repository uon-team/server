import { LetsEncryptStorageAdapter } from "../StorageAdapter";
import { Certificate, Account, Challenge } from "../Models";

import * as path from 'path';
import * as fs from 'fs';
import { FsAdapter } from "../../fs/FsAdapter";


export interface LocalStorageAdapterOptions {
    fsAdapter: FsAdapter;
}


/**
 * Storage adapter for storing Let's Encrypt accounts and certificates 
 * on the local hard disk. make sure the baseDir is not publicly accessible.
 */
export class LetsEncryptFsStorageAdapter implements LetsEncryptStorageAdapter {

    private _accounts: string = 'accounts';
    private _certificates: string = 'certs';
    private _challenges: string = 'challenges'

    private _fs: FsAdapter

    constructor(options: LocalStorageAdapterOptions) {

        // make sure directories exist
        //this.createDirectories(options.baseDir);

        this._fs = options.fsAdapter;

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

            if (cert) {
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

        return this._fs.read(filepath)
            .then((buffer) => {
                return JSON.parse(buffer.toString('utf8'));
            });

    }

    private writeJson(filepath: string, obj: any): Promise<void> {


        let res = JSON.stringify(obj, null, 2);

        return this._fs.write(filepath, Buffer.from(res))
            .then(() => {

            });

    }
}
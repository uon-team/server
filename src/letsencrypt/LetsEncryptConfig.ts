
import { InjectionToken } from '@uon/core';
import { LetsEncryptStorageAdapter } from './StorageAdapter';

export const LE_CONFIG = new InjectionToken<LetsEncryptConfig>("Let's Encrypt configuration");


export interface LetsEncryptConfig {

    // The let's encrypt endpoint
    environment?: 'production' | 'staging',

    // the account email address
    account: string,

    // the list of domains for which to obtain a certificate
    domains: string[],

    // The storage adapter for accounts, certificates and challenges
    storageAdapter: LetsEncryptStorageAdapter;

    // a temp dir to store temporary files, defaults to os.tmpdir()
    tempDir?: string;

}
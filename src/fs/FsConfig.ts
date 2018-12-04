
import { Type, InjectionToken } from '@uon/core';
import { FsAdapter } from './FsAdapter';


export const FS_CONFIG = new InjectionToken<FsConfig>('File System Configuration');

export interface FsAdapterConfig {

    /**
     * the name of the adapter, used for debugging purposes
     */
    name?: string;

    /**
     * an injection token used to retrieve the adapter
     */
    token: any;

    /**
     * the adapter instance to use
     */
    adapter: FsAdapter;

}

export interface FsConfig {

    /**
     * a list of adapters to instanciate
     */
    adapters: FsAdapterConfig[];

}
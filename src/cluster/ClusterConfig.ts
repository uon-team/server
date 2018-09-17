import { InjectionToken } from "@uon/core";

import { LockAdapter } from './ClusterLock';
import { FileLockAdapter } from "./adapters/FileLockAdapter";



// the unique http config token
export const CLUSTER_CONFIG = new InjectionToken<ClusterConfig>('Cluster Configuration');


export interface ClusterConfig {

    /**
     * Whether clustering is enabled
     */
    enabled?: boolean;


    /**
     * Number of process to launch, defaults to os.cpus().length
     */
    concurrency?: number;


    /**
     * The adapter for storing locks
     */
    lockAdapter: LockAdapter;

}

export const CLUSTER_DEFAULT_CONFIG: ClusterConfig = {
    enabled: false,
    concurrency: 0,
    lockAdapter: new FileLockAdapter()
}
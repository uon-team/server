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
     * The number of processes to launch.
     * If set to 0 or not defined, the value defaults to the 
     * number of cores available on the machine 
     */
    concurrency?: number;

    /**
     * Whether or not to relaunch workers when they exit
     */
    relaunchOnExit?: boolean;


    /**
     * The adapter for storing locks
     */
    lockAdapter?: LockAdapter;

}

export const CLUSTER_DEFAULT_CONFIG: ClusterConfig = {
    enabled: false,
    concurrency: 0,
    relaunchOnExit: false,
    lockAdapter: new FileLockAdapter()
}
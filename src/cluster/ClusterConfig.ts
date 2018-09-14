import { InjectionToken } from "@uon/core";


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

}
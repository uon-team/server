import { InjectionToken } from "@uon/core";



export const CLUSTER_MASTER_TASK = new InjectionToken<any>("Pre fork work to be done");
export const CLUSTER_WORKER_TASK = new InjectionToken<any>("Post fork work to be done");

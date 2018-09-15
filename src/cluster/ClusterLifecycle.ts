import { InjectionToken } from "@uon/core";



export const CLUSTER_MASTER_INIT = new InjectionToken<any>("Master process init");
export const CLUSTER_WORKER_INIT = new InjectionToken<any>("Worker process init");

export const CLUSTER_MASTER_EXIT = new InjectionToken<any>("Master process exit");
export const CLUSTER_WORKER_EXIT = new InjectionToken<any>("Worker process exit");


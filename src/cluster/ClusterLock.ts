


export interface ClusterLock {
    token: string;
    createdAt: Date;
    duration: number;
}



export interface LockAdapter {


    lock(token: string, duration?: number): Promise<boolean>;
    unlock(token: string): Promise<boolean>;
    clear(): Promise<void>;

}
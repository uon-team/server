


export interface ClusterLock {
    token: string;
    createdAt: Date;
    duration: number;
}

export interface LockAdapter {

    /**
     * Create a lock with a given token and an optional maximum duration
     * @param token 
     * @param duration 
     */
    lock(token: string, duration?: number): Promise<boolean>;

    /**
     * Dispose of lock with a given token
     * @param token 
     */
    unlock(token: string): Promise<boolean>;

    /**
     * Clear all locks
     */
    clear(): Promise<void>;

}
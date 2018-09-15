

export interface LockAdapter {


    lock(token: string, unique?: boolean): Promise<boolean>;
    unlock(token: string): Promise<boolean>;
    clear(): Promise<void>;

}
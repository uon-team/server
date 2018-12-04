
import { Readable, Writable } from 'stream';

export interface FileStat {
    modified?: Date;
    created?: Date;
    size?: number;
    name?: string;
    ext?: string;
    mimeType?: string;
    url?: string;
    path?: string;
}


/**
 * Provides an interface for reading and writing files regardless of where
 * they are stored.
 * 
 * 
 */
export abstract class FsAdapter {

    /**
     * Creates a readable stream
     * @param path 
     * @param options 
     */
    abstract createReadStream(path: string, options?: any): Readable;

    /**
     * Creates a writable stream
     * @param path 
     * @param options 
     */
    abstract createWriteStream(path: string, options?: any): Writable;

    /**
     * Reads a whole file a returns a buffer with its content
     * @param path 
     */
    abstract read(path: string): Promise<Buffer>;

    /**
     * Writes a buffer to a file
     * @param path 
     * @param data 
     */
    abstract write(path: string, data: Buffer): Promise<FileStat>;

    /**
     * Deletes a file
     * @param path 
     */
    abstract delete(path: string): Promise<boolean>;

    /**
     * Get information on a file
     * @param path 
     */
    abstract stat(path: string): Promise<FileStat>;

    /**
     * Lists all files in a directory
     * @param dir 
     */
    abstract list(dir: string): Promise<FileStat[]>;


    /**
     * Copy a file
     * @param from 
     * @param to 
     */
    abstract copy?(from: string, to: string): Promise<boolean>;

    /**
     * Move a file
     * @param from 
     * @param to 
     */
    abstract move?(from: string, to: string): Promise<boolean>;


}
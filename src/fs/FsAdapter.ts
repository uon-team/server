

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

export abstract class FsAdapter {


    abstract read(path: string): Promise<Buffer>;

    abstract write(path: string, data: Buffer): Promise<FileStat>;

    abstract delete(path: string): Promise<boolean>;

    abstract stat(path: string): Promise<FileStat>;

}
import { LogAdapter } from '../LogAdapter';
import { LogEntry, LogSeverity } from '../Log';

import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';



const CONFIG_DEFAULTS: any = {
    maxFileSize: 16 * 1024 * 1024, // 16MB
    format: (...args: any[]) => { return args.join(' | ') },
    newFileEvery: 'never'
}


export interface FileLoggerConfig {
    /**
     * Where to put the log files
     */
    basePath: string;

    /**
     * the base file name
     */
    filename: string;

    /**
     * Maximum log size (in bytes) before creating a new file
     */
    maxFileSize?: number,

    /**
     * When to create a new log file
     */
    newFileEvery?: 'day' | 'week' | 'month' | 'never';

    /**
     * A function to format log arguments to string
     */
    format?: (...args: any[]) => string;

}



/**
 * 
 */
export class FileLogger implements LogAdapter {


    private stream: Writable;
    private config: FileLoggerConfig;

    constructor(config: FileLoggerConfig) {


        this.config = Object.assign({}, CONFIG_DEFAULTS, config);

        let fullpath = path.join(this.config.basePath, this.config.filename);

        this.stream = fs.createWriteStream(fullpath, { flags: 'a' });
    }

    write(entry: LogEntry) {

        this.stream.write(`${entry.date.toISOString()} - ${LogSeverity[entry.severity]} - ${this.config.format(...entry.args)}\n`);

    }


}
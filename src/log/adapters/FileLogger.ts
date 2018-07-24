import { LogAdapter } from '../LogAdapter';
import { LogEntry, LogSeverity } from '../Log';

import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';

export class FileLogger implements LogAdapter {


    private stream: Writable;

    constructor(private basePath: string, filename: string) {


        let fullpath = path.join(basePath, filename);

        this.stream = fs.createWriteStream(fullpath, { flags: 'a' });
    }

    write(entry: LogEntry) {

        this.stream.write(`${entry.date.toISOString()} - ${LogSeverity[entry.severity]} - ${entry.message}\n`);

    }
}
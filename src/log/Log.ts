import { LogAdapter } from "./LogAdapter";



export enum LogSeverity {
    Debug = 0,
    Normal,
    Warning,
    Error
}

export interface LogEntry {

    date: Date;
    severity: LogSeverity;
    topic: string;
    message: string;
}


export class Log {

    constructor(readonly name: string, private adapter: LogAdapter) {

    }


    debug() {

    }

    log() {

    }

    warn() {

    }

    error() {

    }

}
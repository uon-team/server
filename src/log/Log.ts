import { LogAdapter } from "./LogAdapter";



export enum LogSeverity {
    Debug = 0,
    Info,
    Warning,
    Error
}

export interface LogEntry {

    date: Date;
    severity: LogSeverity;
    args: any[];
}



export class Log {

    constructor(private adapter: LogAdapter, private argSeparator: string = " | ") {

    }

    debug(...args: any[]) {

        this.writeEntry(LogSeverity.Debug, args);
    }

    log(...args: any[]) {
        this.writeEntry(LogSeverity.Info, args);
    }

    warn(...args: any[]) {
        this.writeEntry(LogSeverity.Warning, args);
    }

    error(...args: any[]) {
        this.writeEntry(LogSeverity.Error, args);
    }

    private writeEntry(sev: LogSeverity, args: any[]) {

        let entry: LogEntry = {
            date: new Date(),
            severity: sev,
            args: args
        };

        this.adapter.write(entry);
    }

}
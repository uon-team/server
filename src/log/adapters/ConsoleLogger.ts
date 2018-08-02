import { LogAdapter } from '../LogAdapter';
import { LogEntry, LogSeverity } from '../Log';

export class ConsoleLogger implements LogAdapter {


    write(entry: LogEntry) {

        switch(entry.severity) {
            case LogSeverity.Debug: {
                console.debug(`${entry.date.toISOString()} - ${this.format(...entry.args)}`);
                break;
            }
            case LogSeverity.Info: {
                console.log(`${entry.date.toISOString()} - ${this.format(...entry.args)}`);
                break;
            }
            case LogSeverity.Warning: {
                console.warn(`${entry.date.toISOString()} - ${this.format(...entry.args)}`);
                break;
            }
            case LogSeverity.Error: {
                console.error(`${entry.date.toISOString()} - ${this.format(...entry.args)}`);
                break;
            }
        }

    }

    private format(...args: any[]) {

        return args.join(' | ');
    }
}
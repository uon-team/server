import { LogAdapter } from '../LogAdapter';
import { LogEntry, LogSeverity } from '../Log';

export class ConsoleLogger implements LogAdapter {


    write(entry: LogEntry) {

        switch(entry.severity) {
            case LogSeverity.Debug: {
                console.debug(`${entry.date.toISOString()} - ${entry.message}`);
                break;
            }
            case LogSeverity.Normal: {
                console.log(`${entry.date.toISOString()} - ${entry.message}`);
                break;
            }
            case LogSeverity.Warning: {
                console.warn(`${entry.date.toISOString()} - ${entry.message}`);
                break;
            }
            case LogSeverity.Error: {
                console.error(`${entry.date.toISOString()} - ${entry.message}`);
                break;
            }
        }

    }
}
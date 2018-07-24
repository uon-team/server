
import { LogEntry } from './Log';

export abstract class LogAdapter {

    abstract write(entry: LogEntry): void;

}
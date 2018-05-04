
import { Type, InjectionToken } from '@uon/core';
import { LogAdapter } from './LogAdapter';
import { Log } from './Log';


export const LOG_CONFIG = new InjectionToken<LogConfig>('Logs Configuration');

export interface LogAdapterConfig {

    // the name of the adapter, used for debugging purposes
    name?: string;

    // an injection token used to retrieve the adapter
    token: InjectionToken<any>;

    // the adapter instance to use
    adapter: LogAdapter;

    // the type of log to instanciate, must inherit Log class
    type?: Type<any>;

};

export interface LogConfig {

    // a list of adapters to instanciate
    adapters: LogAdapterConfig[];

}
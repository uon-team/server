

import { Module, ModuleWithProviders, Provider } from '@uon/core';
import { LogConfig, LOG_CONFIG } from './LogConfig';
import { Log } from './Log';


@Module({
    providers: []
})
export class LogModule {

    static WithConfig(config: LogConfig): ModuleWithProviders {

        let providers: Provider[] = [
            {
                token: LOG_CONFIG,
                value: config
            }
        ];

        // add in fs providers
        for(let i = 0; i < config.adapters.length; ++i) {

            let a = config.adapters[i];

            let log_type = a.type || Log;

            providers.push({
                token: a.token,
                factory: () => {
                    
                }
            });
        }

        return {
            module: LogModule,
            providers: providers
        }
    }
}
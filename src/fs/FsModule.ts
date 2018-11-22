
import { Module, ModuleWithProviders, Provider } from '@uon/core';
import { FsConfig, FS_CONFIG } from './FsConfig';

@Module({
    providers: [
    ]
})
export class FsModule {

    static WithConfig(config: FsConfig): ModuleWithProviders {

        let providers: Provider[] = [
            {
                token: FS_CONFIG,
                value: config
            }
        ];

        // add in fs providers
        for(let i = 0; i < config.adapters.length; ++i) {

            let a = config.adapters[i];

            providers.push({
                token: a.token,
                value: a.adapter
            });
        }

        return {
            module: FsModule,
            providers: providers
        };
    }
}
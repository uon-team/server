
import { Module, ModuleWithProviders } from '@uon/core';
import { LetsEncryptConfig, LE_CONFIG } from './LetsEncryptConfig';
import { LetsEncryptService } from './LetsEncryptService';


@Module({
    providers: [
        LetsEncryptService
    ]
})
export class LetsEncryptModule {

    static WithConfig(config: LetsEncryptConfig): ModuleWithProviders {

        return {
            module: LetsEncryptModule,
            providers: [
                {
                    token: LE_CONFIG,
                    value: config
                }
            ]

        };
    }
}
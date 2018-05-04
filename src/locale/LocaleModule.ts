import { Module, ModuleWithProviders, APP_INITIALIZER, Provider } from '@uon/core';
import { LocaleConfig, LOCALE_CONFIG } from './LocaleConfig';
import { TranslationService } from './TranslationService';
import { LocalizationService } from './LocalizationService';


@Module({
    providers: [TranslationService, LocalizationService]
})
export class LocaleModule {


    static WithConfig(config: LocaleConfig): ModuleWithProviders {

        return {
            module: LocaleModule,
            providers: [
                {
                    token: LOCALE_CONFIG,
                    value: config
                }
            ]
        };

    }


}
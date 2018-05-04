
import { Module, ModuleWithProviders, ObjectUtils, APP_INITIALIZER } from '@uon/core';
import { MailerConfig, MAILER_CONFIG } from './MailerConfig';
import { MailerService } from './MailerService';



@Module({
    imports: [
    ],
    providers: [
        MailerService
    ]
})
export class MailerModule {


    static WithConfig(config: MailerConfig): ModuleWithProviders {


        return {

            module: MailerModule,
            providers: [
                {
                    token: MAILER_CONFIG,
                    value: config
                }
            ]
        }
    }
}

import { Module, ModuleWithProviders } from '@uon/core';
import { LetsEncryptConfig, LE_CONFIG } from './LetsEncryptConfig';
import { LetsEncryptService } from './LetsEncryptService';

import { CLUSTER_MASTER_TASK } from '../cluster/ClusterLifecycle';
import { ClusterModule } from '../cluster/ClusterModule';


@Module({
    imports: [
        ClusterModule
    ],
    providers: [
        LetsEncryptService,
        {
            token: CLUSTER_MASTER_TASK,
            factory: (service: LetsEncryptService, config: LetsEncryptConfig) => {

                // ensure certificates are loaded
                console.log('LetsEncrypt on Master');

                return service.getCertificates().then(() => {

                    console.log('LetsEncrypt done on Master');
                });

            },
            deps: [LetsEncryptService, LE_CONFIG],
            multi: true
        }
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
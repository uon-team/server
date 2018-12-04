
import { Module, ModuleWithProviders } from '@uon/core';
import { Router } from '@uon/router';
import { LetsEncryptConfig, LE_CONFIG } from './LetsEncryptConfig';
import { LetsEncryptService } from './LetsEncryptService';

import { CLUSTER_MASTER_INIT, CLUSTER_WORKER_INIT } from '../cluster/ClusterLifecycle';
import { ClusterModule } from '../cluster/ClusterModule';
import { LetsEncryptController } from './LetsEncryptController';
import { HTTP_TLS_PROVIDER, HttpTLSProvider } from '../http/TlsProvider';
import { HTTP_REDIRECT_ROUTER, HttpRoute } from '../http/HttpRouter';



@Module({
    imports: [
        ClusterModule
    ],
    providers: [
        LetsEncryptService,
        {
            token: HTTP_TLS_PROVIDER,
            factory: (service: LetsEncryptService): HttpTLSProvider => {
                return service;
            },
            deps: [LetsEncryptService]
        },
        {
            token: CLUSTER_WORKER_INIT,
            factory: (router: Router<HttpRoute>) => {
                router.add({
                    path: '/.well-known/acme-challenge',
                    outlet: LetsEncryptController
                });
            },
            deps: [HTTP_REDIRECT_ROUTER],
            multi: true
        }
    ],

    declarations: [
        //LetsEncryptController
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
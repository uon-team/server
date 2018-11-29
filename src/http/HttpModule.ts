
import { Module, ModuleWithProviders, ObjectUtils } from '@uon/core';
import { Router } from '@uon/router';

import { HttpServer } from './HttpServer';
import { HttpConfig, HTTP_CONFIG, HTTP_CONFIG_DEFAULTS } from './HttpConfig';
import { HTTP_ROUTER, HTTP_REDIRECT_ROUTER, HttpRoute } from './HttpRouter';

import { ClusterModule } from '../cluster/ClusterModule';
import { CLUSTER_WORKER_INIT } from '../cluster/ClusterLifecycle';




@Module({
    imports: [
        ClusterModule
    ],
    providers: [
        HttpServer,
        {
            token: HTTP_CONFIG,
            value: HTTP_CONFIG_DEFAULTS
        },
        {
            token: HTTP_ROUTER,
            factory: () => {
                return new Router(HttpRoute)
            },
            deps: []

        },
        {
            token: HTTP_REDIRECT_ROUTER,
            value: new Router(HttpRoute)
        },
        {
            token: CLUSTER_WORKER_INIT,
            factory: (server: HttpServer) => {
                return server.start();
            },
            deps: [HttpServer],
            multi: true
        }
    ],
    declarations: []
})
export class HttpModule {


    /**
     * The only way to import the HttpModule is with a config, this is a helper for that.
     * @param config 
     */
    static WithConfig(config: HttpConfig): ModuleWithProviders {

        // merge provided config with the default
        const merged_config = ObjectUtils.extend({}, HTTP_CONFIG_DEFAULTS, config);

        // return a module with providers object
        return {
            module: HttpModule,
            providers: [
                {
                    token: HTTP_CONFIG,
                    value: merged_config
                }

            ]
        }
    }


}
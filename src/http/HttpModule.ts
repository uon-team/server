
import { Application, Module, ModuleWithProviders, ObjectUtils, APP_INITIALIZER } from '@uon/core';
import { HttpServer } from './HttpServer';
import { HttpContext } from './HttpContext';
import { HttpConfig, HTTP_CONFIG, HTTP_CONFIG_DEFAULTS } from './HttpConfig';
import { HttpRequestBody } from './HttpRequestBody';

import { HttpCache } from './transforms/HttpCache';
import { HttpCookies } from './transforms/HttpCookies';
import { HttpEncoding } from './transforms/HttpEncoding';
import { HttpRange } from './transforms/HttpRange';

import { HTTP_ROUTER, HTTP_REDIRECT_ROUTER, HttpRouter } from './HttpRouter';

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
            factory: (app: Application) => {
                return HttpRouter.FromModuleRefs(app.modules);
            },
            deps: [Application]

        },
        {
            token: HTTP_REDIRECT_ROUTER,
            value: new HttpRouter()
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
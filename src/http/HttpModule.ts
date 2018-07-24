
import { Application, Module, ModuleWithProviders, ObjectUtils, APP_INITIALIZER } from '@uon/core';
import { HttpServer } from './HttpServer';
import { HttpContext } from './HttpContext';
import { HttpConfig, HTTP_CONFIG, HTTP_CONFIG_DEFAULTS } from './HttpConfig';
import { HttpCache } from './HttpCache';
import { HttpCookies } from './HttpCookies';
import { HttpEncoding } from './HttpEncoding';
import { HttpRange } from './HttpRange';
import { HttpRequestBody } from './HttpRequestBody';

import { HTTP_ROUTER, RouterFromModuleRefs } from './HttpRouter';

@Module({
    imports: [
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
                return RouterFromModuleRefs(app.modules);
            },
            deps: [Application]

        },
        {
            token: APP_INITIALIZER,
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
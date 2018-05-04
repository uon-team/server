

import { Module, ModuleWithProviders, APP_INITIALIZER } from '@uon/core';
import { WsConfig, WS_CONFIG } from './WsConfig';
import { WsServer } from './WsServer';

@Module({
    providers: [WsServer]
})
export class WsModule {

    static WithConfig(config: WsConfig): ModuleWithProviders {

        return {
            module: WsModule,
            providers: [
                {
                    token: WS_CONFIG,
                    value: config
                },
                {
                    token: APP_INITIALIZER,
                    factory: (ws: WsServer) => {
                        //console.log(ws);
                        return ws.start();
                    },
                    deps: [WsServer],
                    multi: true
                }
            ]
        };

    }
}
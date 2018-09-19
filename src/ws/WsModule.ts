import { Module, Application } from "@uon/core";
import { ClusterModule } from "../cluster/ClusterModule";
import { CLUSTER_WORKER_INIT } from "../cluster/ClusterLifecycle";
import { HttpServer } from "../http/HttpServer";
import { HttpModule } from "../http/HttpModule";
import { WsService } from "./WsService";
import { WS_ROUTER, WsRouter } from "./WsController";



@Module({
    imports: [
        ClusterModule,
        HttpModule
    ],
    providers: [
        WsService,
        {
            token: WS_ROUTER,
            factory: (app: Application) => {
                return WsRouter.FromModuleRefs(app.modules);
            },
            deps:[Application]
        },
        {
            token: CLUSTER_WORKER_INIT,
            factory: (http: HttpServer, service: WsService, router: WsRouter) => {
                http.on('upgrade', (context) => {
                    console.log('got me some upgrade request', context.request.uri);

                    service.upgrade(context);

                    console.log(router.match(context.request.uri.pathname));

                    context.socket.destroy();
                });
            },
            deps: [HttpServer, WsService, WS_ROUTER],
            multi: true
        }
    ]
})
export class WsModule { }
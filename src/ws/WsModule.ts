import { Module, Application } from "@uon/core";
import { ClusterModule } from "../cluster/ClusterModule";
import { CLUSTER_WORKER_INIT } from "../cluster/ClusterLifecycle";
import { HttpServer } from "../http/HttpServer";
import { HttpModule } from "../http/HttpModule";
import { WsService } from "./WsService";


@Module({
    imports: [
        ClusterModule,
        //HttpModule
    ],
    providers: [
        WsService
        /*{
            token: CLUSTER_WORKER_INIT,
            factory: (http: HttpServer, service: WsService, router: WsRouter) => {
                http.on('upgrade', (context) => {
                    service.upgrade(context);
                });
            },
            deps: [HttpServer, WsService, WS_ROUTER],
            multi: true
        }*/
    ]
})
export class WsModule { }
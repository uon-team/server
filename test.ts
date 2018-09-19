import { Module, Application, Injectable } from "@uon/core";

import { HttpModule } from './src/http/HttpModule';

import { ClusterModule } from './src/cluster/ClusterModule';
import { ClusterService } from './src/cluster/ClusterService';

import * as cluster from 'cluster';
import { CLUSTER_WORKER_INIT } from "./src/cluster/ClusterLifecycle";
import { FileLockAdapter } from "./src/cluster/adapters/FileLockAdapter";
import { HttpController, HttpRoute, HttpRouter } from "./src/http/HttpRouter";
import { HttpResponse } from "./src/http/HttpResponse";

import { LocalFsAdapter } from './src/fs/adapters/LocalFsAdapter';
import { HttpError } from "./src/http/HttpError";
import { HttpRequest } from "./src/http/HttpRequest";
import { HttpUpgradeContext } from "./src/http/HttpUpgradeContext";
import { WsModule } from "./src/ws/WsModule";
import { WsController, WsRoute } from "./src/ws/WsController";


@Injectable()
export class WorkerTest {

    constructor(private service: ClusterService) {

    }

    start() {

        this.service.lock('test-lock').then((res) => {

            // console.log(cluster.worker.id, res);

            if (res) {
                setTimeout(() => {

                    this.service.unlock('test-lock').then(() => {

                        console.log('unlocked');
                    });
                }, 1000);
            }
        })
    }
}


@HttpController({
    path: '/'
})
export class RootController {

    constructor(private res: HttpResponse) {

    }

    @HttpRoute({
        method: 'GET',
        path: '/'
    })
    homePage() {

        console.log(cluster.worker.id);
        this.res.send('Hello world')
    }
}


@WsController({
    path: '/testws'
})
export class MyWSController {

    constructor(private req: HttpRequest, private context: HttpUpgradeContext) {

    }

    @WsRoute({
        path: '/'
    })
    upgradeConnection() {

        console.log('ws routing connected');

        
        
    }
}


@HttpController({
    path: '/what',
    parent: RootController
})
export class LeafController {

    constructor(private response: HttpResponse) {

    }

    @HttpRoute({
        method: 'GET',
        path: '/'
    })
    homePage() {

        let fs = new LocalFsAdapter({basePath: __dirname + '/temp'});
        return fs.stat('index.html').then((stats) => {


            this.response.setHeader('Content-Type', stats.mimeType);

            this.response.stream(fs.createReadStream('index.html'));

            return this.response.finish();


        }).catch((err) => {

            throw new HttpError(404);
        });
    }
}





@Module({

    imports: [

        HttpModule.WithConfig({
            plainPort: 8080
        }),

        ClusterModule.WithConfig({
            enabled: false,
            concurrency: 2,
            lockAdapter: new FileLockAdapter()
        }),
        WsModule
    ],
    providers: [
     
    ],
    declarations: [
        LeafController,
        RootController,
        MyWSController
    ]
})
export class TestModule {

    constructor(service: ClusterService) {


    }
}

Application.Bootstrap(TestModule).start();
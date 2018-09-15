import { Module, Application, Injectable } from "@uon/core";

import { HttpModule } from './src/http/HttpModule';

import { ClusterModule } from './src/cluster/ClusterModule';
import { ClusterService } from './src/cluster/ClusterService';

import * as cluster from 'cluster';
import { CLUSTER_WORKER_INIT } from "./src/cluster/ClusterLifecycle";
import { FileLockAdapter } from "./src/cluster/adapters/FileLockAdapter";
import { HttpRouter, HttpRoute } from "./src/http/HttpRouter";
import { HttpResponse } from "./src/http/HttpResponse";


@Injectable()
export class WorkerTest {

    constructor(private service: ClusterService) {

    }

    start() {

        this.service.lock('test-lock').then((res) => {

           // console.log(cluster.worker.id, res);

            if(res) {
                setTimeout(() => {

                    this.service.unlock('test-lock').then(() => {

                        console.log('unlocked');
                    });
                }, 1000);
            }
        })
    }
}


@HttpRouter({
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


@HttpRouter({
    path: '/what',
    parent: RootController
})
export class LeafController {

    constructor(private res: HttpResponse) {

    }

    @HttpRoute({
        method: 'GET',
        path: '/'
    })
    homePage() {

        console.log(cluster.worker.id);
        this.res.send('Hello world What?')
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
        })
    ],
    providers: [
        WorkerTest,
        {
            token: CLUSTER_WORKER_INIT,
            factory: (w: WorkerTest) => {
                return w.start();
            },
            deps: [WorkerTest],
            multi: true
        }
    ],
    declarations: [
        LeafController,
        RootController
    ]
})
export class TestModule {

    constructor(service: ClusterService) {


    }
}

Application.Bootstrap(TestModule).start();
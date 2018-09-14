import { Injectable, Inject, Injector } from "@uon/core";
import { ClusterConfig, CLUSTER_CONFIG } from "./ClusterConfig";


import * as cluster from 'cluster';
import * as os from 'os';
import { CLUSTER_MASTER_TASK, CLUSTER_WORKER_TASK } from "./ClusterLifecycle";


/**
 * Manager for the local process cluster
 */
@Injectable()
export class ClusterService {


    constructor(@Inject(CLUSTER_CONFIG) private config: ClusterConfig,
        private injector: Injector) {

    }

    /**
     * Start the cluster service
     */
    start() {

        return Promise.resolve()
            .then(() => {

                // get master prefork work
                if (cluster.isMaster) {

                    return this.sequence(this.injector.get(CLUSTER_MASTER_TASK, []))
                        .then(() => {

                            if (this.config.enabled) {

                                // fork as many times as the user requested
                                for (let i = 0; i < this.config.concurrency; ++i) {
                                    cluster.fork();
                                }
                            }

                        });
                }

            })
            .then(() => {

                // workers needs initialization too you know
                if (cluster.isWorker || !this.config.enabled) {

                    return this.sequence(this.injector.get(CLUSTER_WORKER_TASK, []))
                        .then(() => {

                            console.log(`Finished initialization on worker ${cluster.worker.id}`)

                        });

                }

            });

    }


    private sequence(tasks: any[]) {

        let promise_chain = Promise.resolve();

        // chain initializers if they return a promise
        for (let i = 0; i < tasks.length; ++i) {

            let initer = tasks[i];

            if (initer instanceof Promise) {
                promise_chain = promise_chain.then(() => {
                    return initer;
                });
            }

        }

        return promise_chain;
    }

}
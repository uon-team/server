import { Injectable, Inject, Injector } from "@uon/core";
import { ClusterConfig, CLUSTER_CONFIG } from "./ClusterConfig";
import { CLUSTER_MASTER_INIT, CLUSTER_WORKER_INIT, CLUSTER_WORKER_EXIT, CLUSTER_MASTER_EXIT } from "./ClusterLifecycle";


import * as crypto from 'crypto';
import * as cluster from 'cluster';
import * as os from 'os';

/**
 * Manager for the local process cluster
 */
@Injectable()
export class ClusterService {


    private _instanceId: string;
    private _workers: cluster.Worker[];


    constructor(@Inject(CLUSTER_CONFIG) private config: ClusterConfig,
        private injector: Injector) {

        this._instanceId = crypto.randomBytes(16).toString('base64');

    }

    /**
     * Start the cluster service
     */
    start() {

        return Promise.resolve()
            .then(() => {

                // get master prefork work
                if (cluster.isMaster) {

                    this._workers = [];
                    return this.sequence(this.injector.get(CLUSTER_MASTER_INIT, []))
                        .then(() => {

                            if (this.config.enabled) {

                                let count = this.config.concurrency || os.cpus().length;

                                // fork as many times as the user requested
                                for (let i = 0; i < count; ++i) {
                                    let worker = this.createWorker();
                                    this._workers.push(worker);
                                }
                            }

                        });
                }

            })
            .then(() => {

                // workers needs initialization too you know
                if (cluster.isWorker || !this.config.enabled) {

                    return this.sequence(this.injector.get(CLUSTER_WORKER_INIT, []))
                        .then(() => {

                        });

                }

            })
            .then(() => {

                let exit = this.stop.bind(this);

                process.on('SIGINT', exit);
                process.on('SIGTERM', exit);

                process.on('uncaughtException', (ex) => {

                    console.warn('Uncaught Exception:', ex);
                    this.stop();
                });

                process.on('unhandledRejection', (ex) => {

                    console.warn('Unhandled Promise Rejection:', ex);
                    console.warn('NOTE: PLEASE HANDLE YOUR PROMISE REJECTIONS. !!!TERMINATING!!!');
                    this.stop();
                });

            });

    }

    stop() {

        return this.config.lockAdapter.clear()
            .then(() => {


                let token = cluster.isMaster ? CLUSTER_MASTER_EXIT : CLUSTER_WORKER_EXIT;

                return this.sequence(this.injector.get(token, []))
                    // handle exit for single instance, ie. execute worker exit handlers
                    .then(() => {
                        if(cluster.isMaster && !this.config.enabled) {
                            return this.sequence(this.injector.get(CLUSTER_WORKER_EXIT, []))
                        }
                    })
                    // exit the process
                    .then(() => {

                        process.exit(0);

                    });

            })
    }

    lock(token: string, duration: number = 0): Promise<boolean> {
        return this.config.lockAdapter.lock(token, duration);
    }

    unlock(token: string) {
        return this.config.lockAdapter.unlock(token);
    }


    /**
     * Called when worker exits, handles relauch. master only
     * @param worker 
     * @param code 
     * @param signal 
     */
    private onWorkerExit(worker: cluster.Worker, code: number, signal: string) {
        
        
        let index = this._workers.indexOf(worker);

        if(this.config.relaunchOnExit) {
            this._workers[index] = null;
            this._workers[index] = this.createWorker();
        }
        else {
            this._workers.splice(index, 1);
        }
      

       
    }



    private createWorker(): cluster.Worker {

        let worker = cluster.fork();
        worker.on('exit', this.onWorkerExit.bind(this, worker));

        return worker;
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
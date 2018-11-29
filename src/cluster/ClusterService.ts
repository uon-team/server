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
    async start() {

        if (cluster.isMaster) {

            // get master prefork work
            let master_tasks = this.injector.get(CLUSTER_MASTER_INIT, []);

            // wait for all tasks to complete
            for (let i = 0; i < master_tasks.length; ++i) {
                await master_tasks[i];
            }

            // fork only if enabled in config
            if (this.config.enabled) {

                // get the number of processes to launch
                let count = this.config.concurrency || os.cpus().length;

                // fork as many times as the user requested
                for (let i = 0; i < count; ++i) {
                    let worker = this.createWorker();
                    this._workers.push(worker);
                }
            }

        }


        // workers needs initialization too you know
        if (cluster.isWorker || !this.config.enabled) {

            let worker_tasks = this.injector.get(CLUSTER_WORKER_INIT, []);

            // wait for all tasks to complete
            for (let i = 0; i < worker_tasks.length; ++i) {
                await worker_tasks[i];
            }

        }

        // setup process exit
        const exit = this.onStop.bind(this);
        process.on('SIGINT', exit);
        process.on('SIGTERM', exit);

        // we dont ignore uncaught exceptions
        process.on('uncaughtException', (ex) => {
            console.warn('Uncaught Exception:', ex);
            this.onStop();
        });


        // we dont support unhandled promise rejection
        process.on('unhandledRejection', (ex) => {

            console.warn('Unhandled Promise Rejection:', ex);
            console.warn('NOTE: PLEASE HANDLE YOUR PROMISE REJECTIONS. !!!TERMINATING!!!');
            this.onStop();
        });

    }

    /**
     * Aquire a lock
     * @param token 
     * @param duration 
     */
    lock(token: string, duration: number = 0): Promise<boolean> {
        return this.config.lockAdapter.lock(token, duration);
    }

    /**
     * Discard a lock
     * @param token 
     */
    unlock(token: string) {
        return this.config.lockAdapter.unlock(token);
    }


    /**
     * Called when worker exits, handles relauch. !master only!
     * @param worker 
     * @param code 
     * @param signal 
     */
    private onWorkerExit(worker: cluster.Worker, code: number, signal: string) {

        let index = this._workers.indexOf(worker);

        if (this.config.relaunchOnExit) {
            this._workers[index] = null;
            this._workers[index] = this.createWorker();
        }
        else {
            this._workers.splice(index, 1);
        }

    }

    /**
     * Stops all worker and master processes
     */
    private async onStop() {

        // clear all locks
        await this.config.lockAdapter.clear();

        // master exit tasks
        if (cluster.isMaster) {

            // get master prefork work
            let master_tasks = this.injector.get(CLUSTER_MASTER_EXIT, []);

            // wait for all tasks to complete
            for (let i = 0; i < master_tasks.length; ++i) {
                await master_tasks[i];
            }

        }

        // worker exit tasks
        if (cluster.isWorker || !this.config.enabled) {

            let worker_tasks = this.injector.get(CLUSTER_WORKER_EXIT, []);

            // wait for all tasks to complete
            for (let i = 0; i < worker_tasks.length; ++i) {
                await worker_tasks[i];
            }

        }

        // all done, exit the program
        process.exit(0);

    }


    /**
     * Fork to a new worker !master only!
     */
    private createWorker(): cluster.Worker {

        let worker = cluster.fork();
        worker.on('exit', this.onWorkerExit.bind(this, worker));

        return worker;
    }

}
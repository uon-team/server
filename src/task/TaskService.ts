
/**
 * TODO think about it before implementing
 * 
 * Tasks should be unique across the whole application, ie. they execute only once, NOT once per process
 * 
 * Should tasks execute on the Master process only?
 * What are the context boundaries for the task execution?
 * Can a worker launch a task?
 * Are tasks statically defined in app "config" or can we dynamically launch tasks? 
 * 
 * 
 * 
 */

const DEFAULT_ENQUEUE_OPTIONS = {

}

export interface EnqueueOptions {
    recurring?: boolean;
}

export class TaskService {

    constructor() {

    }

    enqueue(task: any, options: EnqueueOptions = DEFAULT_ENQUEUE_OPTIONS) {

    }

    consume() {

    }


}

import { Module } from '@uon/core';
import { TaskService } from './TaskService';

@Module({
    providers: [
        TaskService
    ]
})
export class TaskModule { }
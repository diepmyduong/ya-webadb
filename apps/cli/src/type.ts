import type { Adb } from "@yume-chan/adb";

export interface ITaskProvider {
    name: string;
    execute(params: any, adb: Adb, context: any): Promise<any>;
}

export interface ITask {
    name: string;
    taskName: string;
    taskParams: any;
}

export interface IFlow {
    name: string;
    tasks: ITask[];
}

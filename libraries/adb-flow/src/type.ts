import type { Adb } from "@yume-chan/adb";

export interface IAdbFlow {
    name: string;
    tasks: IAdbTask[];
}

export interface IAdbTask {
    name: string;
    taskName: string;
    taskParams: any;
    delayBeforeMs?: number;
    delayAfterMs?: number;
}

export interface IAdbTaskProvider<TaskParam extends unknown> {
    name: string;
    execute(
        params: TaskParam,
        adb: Adb,
        context: IExecutionContext,
    ): Promise<any>;
}

export interface IExecutionContext {
    input$?: any;
    [key: string]: any;
}

export type MatchRegion = {
    tx: number;
    ty: number;
    bx: number;
    by: number;
    confidence: string;
    scale: string;
};

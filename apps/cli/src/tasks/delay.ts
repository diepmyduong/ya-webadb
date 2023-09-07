import type { Adb } from "@yume-chan/adb";
import type { ITaskProvider } from "../type.js";

export type DelayParams = {
    timeMs: number;
};

export class DelayTask implements ITaskProvider {
    name = "delay";

    async execute(params: DelayParams, adb: Adb, context: any) {
        const { timeMs } = params as DelayParams;
        await new Promise((resolve) => setTimeout(resolve, timeMs));
    }
}

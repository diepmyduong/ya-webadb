import type { Adb } from "@yume-chan/adb";
import { readProtocolResult } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type TapParams = {
    point: [number, number]; // [x, y]
    duration?: number;
    count?: number;
};

export class TapTask implements ITaskProvider {
    name = "tap";

    async execute(params: TapParams, adb: Adb, context: any) {
        const { point } = params as TapParams;
        console.log("tap point: ", point);
        let cmd = `input tap ${point[0]} ${point[1]}`;
        // if (duration) {
        //     cmd += ` ${duration}`;
        // }
        // if (count) {
        //     cmd += ` ${count}`;
        // }

        console.log(`cmd: ${cmd}`);
        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

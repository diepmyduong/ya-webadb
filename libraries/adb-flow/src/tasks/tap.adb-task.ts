import type { Adb } from "@yume-chan/adb";
import type { IAdbTaskProvider } from "../type.js";
import { readProtocolResult } from "../utils/function.js";
export type TapParams = {
    point: [number, number]; // [x, y]
    duration?: number;
    count?: number;
};

export class TapTask implements IAdbTaskProvider<TapParams> {
    name = "tap";

    async execute(params: TapParams, adb: Adb, __: any) {
        const { point } = params as TapParams;
        let cmd = `input tap ${point[0]} ${point[1]}`;
        console.log(`cmd: ${cmd}`);
        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

export default TapTask;

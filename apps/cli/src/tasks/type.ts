import type { Adb } from "@yume-chan/adb";
import { readProtocolResult } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type TypeParams = {
    text: string;
};

export class TypeTask implements ITaskProvider {
    name = "type";

    async execute(params: TypeParams, adb: Adb, context: any) {
        const { text } = params as TypeParams;
        let cmd = `input keyboard text ${text}`;
        console.log(`cmd: ${cmd}`);
        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

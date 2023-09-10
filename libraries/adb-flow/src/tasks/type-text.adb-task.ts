import type { Adb } from "@yume-chan/adb";
import type { IAdbTaskProvider } from "../type.js";
import { readProtocolResult } from "../utils/function.js";

export type TypeTextParams = {
    text: string;
};

export class TypeTextTask implements IAdbTaskProvider<TypeTextParams> {
    name = "type-text";

    async execute(params: TypeTextParams, adb: Adb, __: any) {
        const { text } = params as TypeTextParams;
        let cmd = `input keyboard text ${text}`;
        console.log(`cmd: ${cmd}`);
        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

export default TypeTextTask;

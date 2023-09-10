import type { Adb } from "@yume-chan/adb";
import type { IAdbTaskProvider } from "../type.js";
import { readProtocolResult } from "../utils/function.js";

export type ShellParams = {
    command: string;
};

export class ShellTask implements IAdbTaskProvider<ShellParams> {
    name = "shell";

    async execute(params: ShellParams, adb: Adb, __: any) {
        const { command } = params as ShellParams;
        console.log(`cmd: ${command}`);
        return await adb.subprocess.shell(command).then(readProtocolResult);
    }
}

export default ShellTask;

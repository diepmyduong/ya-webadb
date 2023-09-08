import type { Adb } from "@yume-chan/adb";
import { readProtocolResult } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type ShellParams = {
    command: string;
};

export class ShellTask implements ITaskProvider {
    name = "shell";

    async execute(params: ShellParams, adb: Adb, context: any) {
        const { command } = params as ShellParams;
        console.log(`cmd: ${command}`);
        return await adb.subprocess.shell(command).then(readProtocolResult);
    }
}

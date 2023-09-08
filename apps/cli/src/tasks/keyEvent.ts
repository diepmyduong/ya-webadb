import type { Adb } from "@yume-chan/adb";
import { AndroidKeyCode } from "../androidKeyCode.js";
import { readProtocolResult } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type KeyEventParams = {
    keyCode: number;
    longpress?: boolean;
};

export class KeyEventTask implements ITaskProvider {
    name = "key-event";

    keyMap = Object.keys(AndroidKeyCode).reduce(
        (map, key) => ({
            ...map,
            [AndroidKeyCode[key as keyof typeof AndroidKeyCode]]: key,
        }),
        {} as any,
    );

    async execute(params: KeyEventParams, adb: Adb, context: any) {
        const { keyCode, longpress = false } = params;

        // sample command: adb shell input keyevent 3
        let cmd = `input keyevent ${
            this.keyMap[keyCode] ? this.keyMap[keyCode] : keyCode
        }`;
        if (longpress) {
            cmd += " --longpress";
        }

        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

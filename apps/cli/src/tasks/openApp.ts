import type { Adb } from "@yume-chan/adb";
import { readProtocolResult } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type OpenAppParams = {
    packageName: string;
    activityName?: string;
};

export class OpenAppTask implements ITaskProvider {
    name = "open-app";

    async execute(params: any, adb: Adb, context: any) {
        const { packageName, activityName } = params as OpenAppParams;

        const cmd = `am start --activity-clear-task -n ${packageName}/${activityName}`;
        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

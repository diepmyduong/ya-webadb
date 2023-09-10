import type { Adb } from "@yume-chan/adb";
import _ from "lodash";
import { AdbTaskRegistry } from "./adb-task-registry.js";
import { Expression } from "./expression.js";
import type { IAdbFlow } from "./type.js";
import { delay } from "./utils/function.js";

export class AdbFlowRunner {
    private expression = new Expression();
    private taskRegistry = new AdbTaskRegistry();

    constructor() {}

    /**
     * Run adb flow script
     * @param flow adb flow script
     * @param adb adb instance
     * @param context init context for the flow
     */
    async run(flow: IAdbFlow, adb: Adb, context: any = {}) {
        console.log("Running flow: " + flow.name);
        await this.taskRegistry.initailize();
        // init context
        for (let i = 0; i < flow.tasks.length; i++) {
            const now = new Date().getTime();
            const task = flow.tasks[i]!;
            try {
                const taskProvider = this.taskRegistry.getTaskProvider(
                    task.taskName,
                );
                if (!taskProvider) {
                    throw new Error(
                        `Task provider '${task.taskName}' not found`,
                    );
                }
                const params = await this.expression.parseObject(
                    task.taskParams,
                    context,
                );
                if (task.delayBeforeMs) await delay(task.delayBeforeMs);
                const result = await taskProvider.execute(params, adb, context);
                if (task.delayAfterMs) await delay(task.delayAfterMs);
                if (result) {
                    _.set(context, "task$" + i, result);
                }
                _.set(context, "input$", result);
                console.log(
                    "Execute task: " +
                        task.name +
                        " success. Time: " +
                        (new Date().getTime() - now) +
                        "ms",
                );
            } catch (err) {
                console.log(
                    "Execute task: " +
                        task.name +
                        " failed. Time: " +
                        (new Date().getTime() - now) +
                        "ms",
                );
                throw err;
            }
        }

        console.log("Flow: " + flow.name + " finished");
        console.log("Context: " + JSON.stringify(context, null, 2));
    }
}

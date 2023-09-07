import type { Adb } from "@yume-chan/adb";
import _ from "lodash";
import { Expression } from "./expression.js";
import { taskProviderFactory } from "./taskProviderFactory.js";
import type { IFlow } from "./type.js";

export class FlowRunner {
    private expression = new Expression();
    constructor() {}

    async run(flow: IFlow, adb: Adb, context: any) {
        console.log("Running flow: " + flow.name);
        // init context
        for (let i = 0; i < flow.tasks.length; i++) {
            const now = new Date().getTime();
            const task = flow.tasks[i]!;
            try {
                const taskProvider = taskProviderFactory.getTaskProvider(
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
                const result = await taskProvider.execute(params, adb, context);
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

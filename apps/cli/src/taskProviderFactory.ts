import { DelayTask } from "./tasks/delay.js";
import { OpenAppTask } from "./tasks/openApp.js";
import { SearchTemplateRegionTask } from "./tasks/search-template-region.js";
import { SwipeTask } from "./tasks/swipe.js";
import { TapTask } from "./tasks/tap.js";
import type { ITaskProvider } from "./type.js";

export class TaskProviderFactory {
    private taskProviders: Record<string, ITaskProvider> = {};
    constructor() {
        this.loadTaskProviders();
    }

    register(taskProvider: ITaskProvider) {
        this.taskProviders[taskProvider.name] = taskProvider;
    }

    getTaskProvider(name: string) {
        return this.taskProviders[name];
    }

    loadTaskProviders() {
        this.register(new OpenAppTask());
        this.register(new DelayTask());
        this.register(new SwipeTask());
        this.register(new SearchTemplateRegionTask());
        this.register(new TapTask());
    }
}

export const taskProviderFactory = new TaskProviderFactory();

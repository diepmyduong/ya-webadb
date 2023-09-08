import { DelayTask } from "./tasks/delay.js";
import { DumpUITask } from "./tasks/dumpUI.js";
import { InstallApkTask } from "./tasks/install-apk.js";
import { KeyEventTask } from "./tasks/keyEvent.js";
import { OpenAppTask } from "./tasks/openApp.js";
import { SearchTemplateRegionTask } from "./tasks/search-template-region.js";
import { SearchUIRegion } from "./tasks/search-ui-region.js";
import { ShellTask } from "./tasks/shell.js";
import { SwipeTask } from "./tasks/swipe.js";
import { TapTask } from "./tasks/tap.js";
import { TypeTask } from "./tasks/type.js";
import { UploadTask } from "./tasks/upload.js";
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
        this.register(new DumpUITask());
        this.register(new SearchUIRegion());
        this.register(new KeyEventTask());
        this.register(new TypeTask());
        this.register(new ShellTask());
        this.register(new InstallApkTask());
        this.register(new UploadTask());
    }
}

export const taskProviderFactory = new TaskProviderFactory();

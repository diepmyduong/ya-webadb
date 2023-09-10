import { DumpUITask, InstallApkTask, KeyEventTask } from "./index.js";
import type { IAdbTaskProvider } from "./type.js";

export class AdbTaskRegistry {
    private _taskProviders: Map<string, IAdbTaskProvider<any>>;
    private _isInitialized = false;

    constructor() {
        this._taskProviders = new Map();
    }

    async initailize() {
        if (this._isInitialized) {
            return;
        }
        await this.discoverTaskProviders();
    }

    /**
     * Register task provider
     * @param taskProvider register task provider
     */
    register(taskProvider: IAdbTaskProvider<any>) {
        if (this._taskProviders.has(taskProvider.name)) {
            throw new Error(
                `task provider: ${taskProvider.name} already exists`,
            );
        }
        this._taskProviders.set(taskProvider.name, taskProvider);
    }

    /**
     * Get task provider by name
     * @param name task provider name
     * @returns task provider
     */
    getTaskProvider(name: string) {
        const taskProvider = this._taskProviders.get(name);
        if (!taskProvider) {
            throw new Error(`task provider: ${name} not found`);
        }
        return taskProvider;
    }

    /**
     * Get all task providers
     * @returns all task providers
     */
    getTaskProviders() {
        return this._taskProviders.values();
    }

    /**
     * scan all task providers by file name pattern "*.adb-task.js"
     */
    private async discoverTaskProviders() {
        const taskProviders = await this.loadTaskProviders();
        // register all task providers
        for (const taskProvider of taskProviders) {
            this.register(taskProvider);
        }
        console.log(`Found ${taskProviders.length} task providers`);
    }

    /** Load task provider */
    private async loadTaskProviders() {
        // scan current workspace for all task providers
        // const loader = await Autoloader.dynamicImport();
        // await loader.fromGlob(__dirname + "/../**/*.adb-task.(ts|js)");
        // const exports = loader.getResult().exports;
        // return exports;
        return [new DumpUITask(), new InstallApkTask(), new KeyEventTask()];
    }
}

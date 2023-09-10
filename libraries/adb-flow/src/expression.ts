import FastQ from "fastq";
import IsolatedVM from "isolated-vm";
import _ from "lodash";
import path from "path";

export type ParsePayload = { text: string; data: any };
export type ExpressionContext = {
    context: IsolatedVM.Context;
    logger: any;
};
export type ExpressionOptions = {
    workerNum?: number;
    methods?: ExpressionMethos;
};
export type ExpressionMethos = Record<string, Function>;

export type ScriptPayload = { script: string; data: any };

export class Expression {
    private logger = console;
    private parseWorkers: FastQ.queueAsPromised<ParsePayload, string>[];
    private scriptWorkers: FastQ.queueAsPromised<ScriptPayload, string>[];
    private parseRolling = 0;
    private scriptRolling = 0;

    constructor(options: ExpressionOptions = {}) {
        // load supported libs script
        const libsScript = path.join(__dirname, "../scripts/bundle.js", "utf8");

        this.parseWorkers = _.times(options.workerNum || 4, () => {
            // init issolate
            const isolate = new IsolatedVM.Isolate({ memoryLimit: 8 });
            const context = isolate.createContextSync();

            // load supported libs to the context
            isolate.compileScriptSync(libsScript).runSync(context);

            // set default timezone for moment libs
            // isolate
            //     .compileScriptSync(`moment.tz.setDefault("${TIMEZONE}")`)
            //     .runSync(context);
            // set custom methods
            this.setupCustomMethods(context, options.methods);

            return FastQ.promise<ExpressionContext, ParsePayload, string>(
                { context, logger: this.logger },
                this.parseWorkerAsyncFn,
                1,
            );
        });

        this.scriptWorkers = _.times(options.workerNum || 4, () => {
            // init issolate
            const isolate = new IsolatedVM.Isolate({ memoryLimit: 8 });
            const context = isolate.createContextSync();

            // load supported libs to the context
            isolate.compileScriptSync(libsScript).runSync(context);
            // set default timezone for moment libs
            // isolate
            //     .compileScriptSync(`moment.tz.setDefault("${TIMEZONE}")`)
            //     .runSync(context);
            // set custom methods
            this.setupCustomMethods(context, options.methods);

            return FastQ.promise<ExpressionContext, ScriptPayload, string>(
                { context, logger: this.logger },
                this.scriptWorkerAsyncFn,
                1,
            );
        });
    }

    private parseWorkerAsyncFn: FastQ.asyncWorker<
        ExpressionContext,
        ParsePayload,
        string
    > = async function ({ text, data }) {
        const context = this.context;
        // create a new global object
        const global = context.global;
        // add the data to the global object
        await global.set("$data", data, { copy: true });
        // parse expression
        let rawTxt = "" + text;
        const stringRegex = /{{(.*?)}}/g;
        const expressionsPromises: Record<string, Promise<any>> = {};
        rawTxt.replace(stringRegex, (__: any, expression: string) => {
            if (!expressionsPromises[expression]) {
                expressionsPromises[expression] = context
                    .eval(expression.replace(/\\(\S)/g, "$1"), { timeout: 200 }) // {{ script }} => script
                    .then((result) => {
                        try {
                            result = JSON.parse(result);
                        } catch (err) {}
                        if (_.isString(result) || _.isNumber(result)) {
                            result = JSON.stringify(result)
                                // replace escape character
                                .replace(/\\n/g, "\\n")
                                .replace(/\\'/g, "\\'")
                                .replace(/\\"/g, '\\"')
                                .replace(/\\&/g, "\\&")
                                .replace(/\\r/g, "\\r")
                                .replace(/\\t/g, "\\t")
                                .replace(/\\b/g, "\\b")
                                .replace(/\\f/g, "\\f")
                                .replace(/^\"(.*)\"$/g, "$1");
                        } else {
                            result = `<<Obj(${JSON.stringify(result)})Obj>>`;
                        }
                        return result || "";
                    })
                    .catch((err) => {
                        this.logger.error(
                            `parse expression error: ${err.message}`,
                        );
                        return "";
                    });
            }
            return expression;
        });

        const expressionResults = await Promise.all(
            _.values(expressionsPromises),
        ).then((results) => {
            return _.zipObject(_.keys(expressionsPromises), results);
        });

        rawTxt = rawTxt.replace(stringRegex, (__: any, expression: string) => {
            return expressionResults[expression] || "";
        });
        return rawTxt
            .replace(
                /\:\"(?: +)?<<Obj\((true|false|[\{|\[].*?[\}|\]])\)Obj>>(?: +)?\"/g,
                ":$1",
            )
            .replace(/<<Obj\((true|false|[\{|\[].*?[\}|\]])\)Obj>>/g, "$1");
    };

    private scriptWorkerAsyncFn: FastQ.asyncWorker<
        ExpressionContext,
        ScriptPayload,
        string
    > = async function ({ script, data }) {
        const context = this.context;
        // create a new global object
        const global = context.global;
        // add the data to the global object
        await global.set("$data", data, { copy: true });

        // parse expression
        return context.evalClosure(script, undefined, {
            timeout: 200,
            result: {
                copy: true,
            },
        });
    };

    // set custom methods
    private setupCustomMethods(
        context: IsolatedVM.Context,
        methods: ExpressionMethos = {},
    ) {
        // set custom methods
        _.each(methods, (method, name) => {
            context.global.setSync(name, method);
        });

        context.global.setSync("$json", function (obj: any) {
            return JSON.stringify(obj);
        });
    }

    // @ExecutionTime("Expression")
    async parse(text: string, data: any = {}): Promise<string> {
        if (this.parseRolling >= this.parseWorkers.length) {
            this.parseRolling = 0;
        }
        const worker = this.parseWorkers[this.parseRolling++]!;
        return worker.push({ text, data });
    }

    async parseObject<T>(obj: T, data: any = {}): Promise<T> {
        try {
            const encode = JSON.stringify(obj);
            const parsed = await this.parse(encode, data);
            return JSON.parse(parsed); // parse to object
        } catch (err) {
            return obj;
        }
    }

    async runScript(script: string, data: any = {}): Promise<any> {
        if (this.scriptRolling >= this.scriptWorkers.length) {
            this.scriptRolling = 0;
        }
        const worker = this.scriptWorkers[this.scriptRolling++]!;
        return worker.push({ script, data });
    }
}

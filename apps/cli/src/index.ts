/// <reference types="node" />

import "source-map-support/register.js";

import {
    Adb,
    AdbServerClient,
    KNOWN_FEATURES,
    type AdbSubprocessProtocol,
} from "@yume-chan/adb";
import { AdbServerNodeTcpConnection } from "@yume-chan/adb-server-node-tcp";
import {
    ConsumableWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { program } from "commander";
import { createWriteStream, mkdirSync, unlinkSync } from "fs";
import { PNG } from "pngjs";
import { AndroidKeyCode } from "./androidKeyCode.js";
import { templateMatcher } from "./templateMatcher.js";

program
    .name("tango-cli")
    .option("-H <host>", "name of adb server host", "127.0.0.1")
    .option(
        "-P <port>",
        "port of adb server",
        (value) => Number.parseInt(value, 10),
        5037,
    )
    .configureHelp({
        subcommandTerm(cmd) {
            let usage = cmd.usage();
            if (usage === "[options]" && cmd.options.length === 0) {
                usage = "";
            }
            return `${cmd.name()} ${usage}`;
        },
    });

function createClient() {
    const opts: { H: string; P: number } = program.opts();
    const connection = new AdbServerNodeTcpConnection({
        host: opts.H,
        port: opts.P,
    });
    const client = new AdbServerClient(connection);
    return client;
}

program
    .command("devices")
    .usage("[-l]")
    .description("list connected devices (-l for long output)")
    .option("-l", "long output", false)
    .action(async (options: { l: boolean }) => {
        function appendTransportInfo(key: string, value: string | undefined) {
            if (value) {
                return ` ${key}:${value}`;
            }
            return "";
        }

        const client = createClient();
        const devices = await client.getDevices();
        for (const device of devices) {
            if (options.l) {
                console.log(
                    // prettier-ignore
                    `${
                        device.serial.padEnd(22)
                    }device${
                        appendTransportInfo("product", device.product)
                    }${
                        appendTransportInfo("model", device.model)
                    }${
                        appendTransportInfo("device", device.device)
                    }${
                        appendTransportInfo("transport_id", device.transportId.toString())
                    }`,
                );
            } else {
                console.log(`${device.serial}\tdevice`);
            }
        }
    });

interface DeviceCommandOptions {
    d: true | undefined;
    e: true | undefined;
    s: string | undefined;
    t: bigint | undefined;
}

function createDeviceCommand(nameAndArgs: string) {
    return program
        .command(nameAndArgs)
        .option("-d", "use USB device (error if multiple devices connected)")
        .option(
            "-e",
            "use TCP/IP device (error if multiple TCP/IP devices available)",
        )
        .option(
            "-s <serial>",
            "use device with given serial (overrides $ANDROID_SERIAL)",
            process.env.ANDROID_SERIAL,
        )
        .option("-t <id>", "use device with given transport id", (value) =>
            BigInt(value),
        );
}

async function createAdb(options: DeviceCommandOptions) {
    const client = createClient();
    const transport = await client.createTransport(
        options.d
            ? {
                  usb: true,
              }
            : options.e
            ? {
                  tcp: true,
              }
            : options.s !== undefined
            ? {
                  serial: options.s,
              }
            : options.t !== undefined
            ? {
                  transportId: options.t,
              }
            : undefined,
    );
    const adb = new Adb(transport);
    return adb;
}

createDeviceCommand("shell [args...]")
    .usage("[options] [-- <args...>]")
    .description(
        "run remote shell command (interactive shell if no command given). `--` is required before command name.",
    )
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const shell = await adb.subprocess.shell(args);

        const stdinWriter = shell.stdin.getWriter();

        process.stdin.setRawMode(true);
        process.stdin.on("data", (data: Uint8Array) => {
            ConsumableWritableStream.write(stdinWriter, data).catch((e) => {
                console.error(e);
                process.exit(1);
            });
        });

        shell.stdout
            .pipeTo(
                new WritableStream({
                    write(chunk) {
                        process.stdout.write(chunk);
                    },
                }),
            )
            .catch((e) => {
                console.error(e);
                process.exit(1);
            });

        shell.exit.then(
            (code) => {
                // `process.stdin.on("data")` will keep the process alive,
                // so call `process.exit` explicitly.
                process.exit(code);
            },
            (e) => {
                console.error(e);
                process.exit(1);
            },
        );
    });

createDeviceCommand("logcat [args...]")
    .usage("[-- <args...>")
    .description("show device log (logcat --help for more)")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const logcat = await adb.subprocess.spawn(`logcat ${args.join(" ")}`);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        process.on("SIGINT", async () => {
            await logcat.kill();
        });
        await logcat.stdout.pipeTo(
            new WritableStream({
                write: (chunk) => {
                    process.stdout.write(chunk);
                },
            }),
        );
    });

createDeviceCommand("reboot [mode]")
    .usage("[bootloader|recovery|sideload|sideload-auto-reboot]")
    .description(
        "reboot the device; defaults to booting system image but supports bootloader and recovery too. sideload reboots into recovery and automatically starts sideload mode, sideload-auto-reboot is the same but reboots after sideloading.",
    )
    .configureHelp({ showGlobalOptions: true })
    .action(async (mode: string | undefined, options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        await adb.power.reboot(mode);
    });

createDeviceCommand("usb")
    .usage(" ")
    .description("restart adbd listening on USB")
    .configureHelp({ showGlobalOptions: true })
    .action(async (options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const output = await adb.tcpip.disable();
        process.stdout.write(output, "utf8");
    });

createDeviceCommand("tcpip port")
    .usage("port")
    .description("restart adbd listening on TCP on PORT")
    .configureHelp({ showGlobalOptions: true })
    .action(async (port: string, options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const output = await adb.tcpip.setPort(Number.parseInt(port, 10));
        process.stdout.write(output, "utf8");
    });

createDeviceCommand("capture [args...]")
    .usage("[-- <args...> ")
    .description("capture device screenshot to given file")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const output = (args[0] || "screenshot") + ".png";
        await makeScreenshot(adb, output);
    });

createDeviceCommand("device-info [args...]")
    .usage("[-- <args...> ")
    .description("show device info")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);

        const info = {
            serial: await adb.getProp("ro.serialno"),
            product: await adb.getProp("ro.product.name"),
            model: await adb.getProp("ro.product.model"),
            device: await adb.getProp("ro.product.device"),
            sdk: await adb.getProp("ro.build.version.sdk"),
            release: await adb.getProp("ro.build.version.release"),
            feature: adb.banner.features.map((feature) => {
                const knownFeature = KNOWN_FEATURES[feature];
                return knownFeature ? `${feature} (${knownFeature})` : feature;
            }),
            network: {
                ip: await adb.subprocess
                    .shell(
                        `ifconfig | grep "inet addr" | awk '{print $2}' | cut -d ':' -f 2`,
                    )
                    .then(readProtocolResult)
                    .then((res) => res.split("\r\n").filter((l) => l !== "")),
                mac: await adb.subprocess
                    .shell(`ifconfig | grep "HWaddr"`)
                    .then(readProtocolResult)
                    .then((res) => res.split("\r\n").filter((l) => l !== "")),
                publicIp: await adb.subprocess
                    .shell(`curl -s ipinfo.io/ip`)
                    .then(readProtocolResult),
            },
            location: {
                gps: await adb.subprocess
                    .shell(`settings get secure location_providers_allowed`)
                    .then(readProtocolResult),
            },
        };

        console.log(JSON.stringify(info, undefined, 4));
    });

createDeviceCommand("open-app [args...]")
    .usage("[-- <args...> ")
    .description("open app on device")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const app = args[0];
        let activity = args[1];

        if (!activity) {
            // find default activity
            const protocol = await adb.subprocess.shell(
                `dumpsys package ${app} | grep -A 1 android.intent.action.MAIN:`,
            );
            let result = await readProtocolResult(protocol);
            const regex = new RegExp(`${app}\/(.\\S+)`);
            const match = regex.exec(result);
            if (!match) {
                throw new Error("cannot find default activity");
            }
            activity = match[1];
        }
        // sample command: adb shell am start -n com.android.settings/.Settings
        const protocol = await adb.subprocess.shell(
            `am start -n ${app}/${activity}`,
        );
        let result = await readProtocolResult(protocol);
        console.log(result);
    });

createDeviceCommand("list-apps [args...]")
    .usage("[-- <args...> ")
    .description("list apps on device")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        // sample command: adb shell pm list packages -f
        const protocol = await adb.subprocess.shell("pm list packages -f");
        let result = await readProtocolResult(protocol);
        const lines = result.split("\r\n");
        const apps = lines
            .filter((l) => l !== "")
            .map((line) => {
                const parts = line.split("=");
                const packageName = parts[1]!;
                const appPath = parts[0]!.split(":")[1];
                return { packageName, appPath };
            });
        console.log(JSON.stringify(apps, undefined, 4));
    });

createDeviceCommand("app-activity [args...]")
    .usage("[-- <args...> ")
    .description("get app activity on device")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const app = args[0];
        // sample command: adb shell dumpsys package com.android.settings | grep -E 'mFocusedActivity'
        const protocol = await adb.subprocess.shell(
            `dumpsys package ${app} | grep -i '${app}\/' | grep Activity`,
        );
        let result = await readProtocolResult(protocol);
        const regex = new RegExp(`${app}\/(.\\S+)`, "g");
        const match = result.matchAll(regex);
        const activities = Array.from(match)
            .map((m) => m[1])
            // remove duplicates
            .filter((value, index, self) => self.indexOf(value) === index);

        console.log(JSON.stringify(activities, undefined, 4));
    });

createDeviceCommand("kill-app [args...]")
    .usage("[-- <args...> ")
    .description("kill app on device")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const app = args[0];
        // sample command: adb shell am force-stop com.android.settings
        const protocol = await adb.subprocess.shell(`am force-stop ${app}`);
        let result = await readProtocolResult(protocol);
        console.log(result);
    });

createDeviceCommand("swipe [args...]")
    .option("-a <action>", "action type: down|up|left|right|point", "up")
    .usage("[-- <args...> ")
    .description("swipe on device")
    .configureHelp({ showGlobalOptions: true })
    .action(
        async (
            args: string[],
            options: DeviceCommandOptions & {
                a: "down" | "up" | "left" | "right" | "point";
            },
        ) => {
            const adb = await createAdb(options);
            const action = options.a;
            let from: number[] = [0, 0];
            let to: number[] = [0, 0];

            const framebuffer = await adb.framebuffer();
            const centerPoint = [framebuffer.width / 2, framebuffer.height / 2];

            switch (action) {
                case "down": {
                    const distance = Number(args[0]) || 100;
                    from = [
                        centerPoint[0]!,
                        Math.max(centerPoint[1]! - distance / 2, 100),
                    ];
                    to = [
                        centerPoint[0]!,
                        Math.min(
                            centerPoint[1]! + distance / 2,
                            framebuffer.height - 100,
                        ),
                    ];
                    break;
                }
                case "up": {
                    const distance = Number(args[0]) || 100;
                    from = [
                        centerPoint[0]!,
                        Math.min(
                            centerPoint[1]! + distance / 2,
                            framebuffer.height - 100,
                        ),
                    ];
                    to = [
                        centerPoint[0]!,
                        Math.max(centerPoint[1]! - distance / 2, 100),
                    ];
                    break;
                }
                case "left": {
                    const distance = Number(args[0]) || 100;
                    from = [
                        Math.min(
                            centerPoint[0]! + distance / 2,
                            framebuffer.width - 100,
                        ),
                        centerPoint[1]!,
                    ];
                    to = [
                        Math.max(
                            centerPoint[0]! - distance / 2,
                            framebuffer.width - 100,
                        ),
                        centerPoint[1]!,
                    ];
                    break;
                }
                case "right": {
                    const distance = Number(args[0]) || 100;
                    from = [
                        Math.max(
                            centerPoint[0]! - distance / 2,
                            framebuffer.width,
                        ),
                        centerPoint[1]!,
                    ];
                    to = [
                        Math.min(
                            centerPoint[0]! + distance / 2,
                            framebuffer.width,
                        ),
                        centerPoint[1]!,
                    ];
                    break;
                }
                case "point": {
                    if (!args[0]) {
                        throw new Error("point is required");
                    }
                    const [x1, y1, x2, y2] = args[0].split(":");
                    from = [Number(x1), Number(y1)];
                    to = [Number(x2), Number(y2)];
                    break;
                }
            }
            // sample command: adb shell input swipe 100 500 100 1450
            const cmd = `input swipe ${from.join(" ")} ${to.join(" ")}`;
            console.log(`action: ${action} cmd: ${cmd}`);
            const protocol = await adb.subprocess.shell(
                `input swipe ${from.join(" ")} ${to.join(" ")}`,
            );
            let result = await readProtocolResult(protocol);
            console.log(result);
        },
    );

program
    .command("kill-server")
    .description("kill the server if it is running")
    .configureHelp({ showGlobalOptions: true })
    .action(async () => {
        const client = createClient();
        await client.killServer();
    });

program
    .command("tap [args...]")
    .option("--image <image>", "image file path")
    .option("--point <point>", "point to tap (x:y)")
    .usage("[-- <args...> ")
    .description("tap on device")
    .configureHelp({ showGlobalOptions: true })
    .action(
        async (
            args: string[],
            {
                image,
                point,
                ...options
            }: DeviceCommandOptions & { image: string; point: string },
        ) => {
            const adb = await createAdb(options);
            let target = [0, 0];
            if (image) {
                // make a screenshot
                mkdirSync("tmp", { recursive: true });
                const screenshotPath = `tmp/screenshot-${new Date().getTime()}.png`;
                await makeScreenshot(adb, screenshotPath);

                // find region of image
                const { tx, ty, bx, by } = await templateMatcher(
                    screenshotPath,
                    image,
                );
                target = [(tx + bx) / 2, (ty + by) / 2];
                console.log(`match region: ${tx} ${ty} ${bx} ${by}`);
                unlinkSync(screenshotPath);
            } else if (point) {
                target = point.split(":").map((p) => Number(p));
            }
            // sample command: adb shell input tap 100 500
            const cmd = `input tap ${target.join(" ")}`;
            console.log(`cmd: ${cmd}`);
            const protocol = await adb.subprocess.shell(cmd);
            let result = await readProtocolResult(protocol);
            console.log(result);
        },
    );

createDeviceCommand("type [args...]")
    .usage("[-- <args...> ")
    .description("type on device")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const text = args[0];
        // sample command: adb shell input text "hello world"
        const protocol = await adb.subprocess.shell(`input text "${text}"`);
        let result = await readProtocolResult(protocol);
        console.log(result);
    });

createDeviceCommand("key-event [args...]")
    .option("-r <repeat>", "repeat event", (value) => Number(value), 1)
    .usage("[-- <args...> ")
    .description("send keyevent on device")
    .configureHelp({ showGlobalOptions: true })
    .action(
        async (
            args: string[],
            { r, ...options }: DeviceCommandOptions & { r: number },
        ) => {
            const adb = await createAdb(options);
            const key = args[0];

            if (!key) {
                throw new Error("key is required");
            }

            const keyMap = Object.keys(AndroidKeyCode).reduce(
                (map, key) => ({
                    ...map,
                    [AndroidKeyCode[key as keyof typeof AndroidKeyCode]]: key,
                }),
                {} as any,
            );

            // sample command: adb shell input keyevent 3
            const cmd = `input keyevent ${keyMap[key] ? keyMap[key] : key}`;
            console.log(`cmd: ${cmd}`);
            for (let i = 0; i < r; i++) {
                await adb.subprocess.shell(cmd);
            }
        },
    );

createDeviceCommand("set-proxy [args...]")
    .option("-h <host>", "proxy host")
    .option("-p <port>", "proxy port")
    .usage("[-- <args...> ")
    .description("set proxy on device")
    .configureHelp({ showGlobalOptions: true })
    .action(
        async (
            args: string[],
            {
                h,
                p,
                ...options
            }: DeviceCommandOptions & {
                h: string;
                p: number;
            },
        ) => {
            const adb = await createAdb(options);
            const host = h;
            const port = p;
            if (!host || !port) {
                throw new Error("host and port are required");
            }

            // sample command: adb shell settings put global http_proxy
            const cmd = `settings put global http_proxy ${host}:${port}`;
            console.log(`cmd: ${cmd}`);
            await adb.subprocess.shell(cmd);

            // verify proxy
            await adb.subprocess
                .shell(`settings get global http_proxy`)
                .then(readProtocolResult)
                .then(console.log);
        },
    );

createDeviceCommand("clear-proxy [args...]")
    .usage("[-- <args...> ")
    .description("clear proxy on device")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        await adb.subprocess.shell(`settings put global http_proxy :0`);
        // verify proxy
        await adb.subprocess
            .shell(`settings get global http_proxy`)
            .then(readProtocolResult)
            .then(console.log);
    });

program.parse();

async function makeScreenshot(adb: Adb, output: string) {
    const framebuffer = await adb.framebuffer();

    return new Promise<void>((resolve, reject) => {
        const png = new PNG({
            width: framebuffer.width,
            height: framebuffer.height,
        });
        png.data = Buffer.from(framebuffer.data);

        const writeStream = createWriteStream(output);
        png.pack().pipe(writeStream);

        writeStream.once("finish", () => {
            resolve();
        });
        writeStream.once("error", (e) => {
            reject(e);
        });
    });
}

async function readProtocolResult(protocol: AdbSubprocessProtocol) {
    const reader = protocol.stdout.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        result += decoder.decode(value);
    }
    return result;
}

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
import { createWriteStream } from "fs";
import { PNG } from "pngjs";

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
        const framebuffer = await adb.framebuffer();

        const output = (args[0] || "screenshot") + ".png";

        const png = new PNG({
            width: framebuffer.width,
            height: framebuffer.height,
        });
        png.data = Buffer.from(framebuffer.data);

        const writeStream = createWriteStream(output);
        png.pack().pipe(writeStream);

        writeStream.once("finish", () => {
            console.log("Screenshot saved to " + output);
            process.exit(0);
        });
        writeStream.once("error", (e) => {
            console.error(e);
            process.exit(1);
        });
    });

createDeviceCommand("info [args...]")
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
        };

        console.log(JSON.stringify(info, undefined, 4));
    });

createDeviceCommand("openapp [args...]")
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

createDeviceCommand("listapps [args...]")
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

createDeviceCommand("appactivity [args...]")
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

program
    .command("kill-server")
    .description("kill the server if it is running")
    .configureHelp({ showGlobalOptions: true })
    .action(async () => {
        const client = createClient();
        await client.killServer();
    });

program.parse();

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

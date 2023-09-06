// The order follows
// https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/transport.cpp#1252
export enum AdbFeature {
    ShellV2 = "shell_v2",
    Cmd = "cmd",
    StatV2 = "stat_v2",
    ListV2 = "ls_v2",
    FixedPushMkdir = "fixed_push_mkdir",
    Abb = "abb",
    AbbExec = "abb_exec",
    SendReceiveV2 = "sendrecv_v2",
}

export const KNOWN_FEATURES: Record<string, string> = {
    [AdbFeature.ShellV2]: `"shell" command now supports separating child process's stdout and stderr, and returning exit code`,
    // 'cmd': '',
    [AdbFeature.StatV2]:
        '"sync" command now supports "STA2" (returns more information of a file than old "STAT") and "LST2" (returns information of a directory) sub command',
    [AdbFeature.ListV2]:
        '"sync" command now supports "LST2" sub command which returns more information when listing a directory than old "LIST"',
    [AdbFeature.FixedPushMkdir]:
        "Android 9 (P) introduced a bug that pushing files to a non-existing directory would fail. This feature indicates it's fixed (Android 10)",
    // 'apex': '',
    // 'abb': '',
    // 'fixed_push_symlink_timestamp': '',
    [AdbFeature.AbbExec]:
        'Supports "abb_exec" variant that can be used to install App faster',
    // 'remount_shell': '',
    // 'track_app': '',
    // 'sendrecv_v2': '',
    sendrecv_v2_brotli:
        'Supports "brotli" compression algorithm when pushing/pulling files',
    sendrecv_v2_lz4:
        'Supports "lz4" compression algorithm when pushing/pulling files',
    sendrecv_v2_zstd:
        'Supports "zstd" compression algorithm when pushing/pulling files',
    // 'sendrecv_v2_dry_run_send': '',
};

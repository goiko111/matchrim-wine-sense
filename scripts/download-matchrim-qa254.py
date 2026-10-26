"""Request download of one existing QA file; never read its contents."""

import ctypes as c
import json
import os
from pathlib import Path
import signal
import stat
import subprocess
import sys
import time


OWNER = "019f9da7-ae96-7c60-a1b4-fafb75b04d6d"
FILE = Path("/Users/GOIKO/Documents/Codex/2026-07-26/"
            "tarea-recuperada-desde-anclados-nombre-original-8/artifacts/"
            "matchrim97-physical-20261020/account/PRIVATE-ACCESS.json")
LEASES = Path("/Users/GOIKO/Library/Application Support/Winerim Automation/"
              "parallel_20261017/leases.json")


def guard():
    lease = json.loads(LEASES.read_text())["leases"]["writer-matchrim-native99"]
    assert lease["owner"] == OWNER
    assert lease["leaseId"] == os.environ["MATCHRIM_WRITER_LEASE"]
    assert lease["reviewAfter"] > time.time() + 45
    mode = FILE.lstat().st_mode
    assert stat.S_ISREG(mode) and stat.S_IMODE(mode) == 0o600


def downloaded():
    flags = subprocess.check_output(["/usr/bin/stat", "-f", "%Sf", str(FILE)],
                                    text=True, timeout=3).strip().split(",")
    return "dataless" not in flags


def main():
    # Terminate this diagnostic even if a native FileProvider call never returns.
    signal.signal(signal.SIGALRM, signal.SIG_DFL)
    signal.alarm(35)
    guard()
    if downloaded():
        print(json.dumps({"status": "ALREADY_LOCAL", "contentsRead": False}))
        return
    # Public Foundation filesystem API only; no AppKit, UI input or credentials.
    foundation = c.CDLL("/System/Library/Frameworks/Foundation.framework/Foundation")
    objc = c.CDLL("/usr/lib/libobjc.A.dylib")
    objc.objc_getClass.argtypes = [c.c_char_p]
    objc.objc_getClass.restype = c.c_void_p
    objc.sel_registerName.argtypes = [c.c_char_p]
    objc.sel_registerName.restype = c.c_void_p
    address = c.cast(objc.objc_msgSend, c.c_void_p).value

    def send(receiver, selector, result=c.c_void_p, argtypes=(), values=()):
        function = c.CFUNCTYPE(result, c.c_void_p, c.c_void_p, *argtypes)(address)
        return function(receiver, objc.sel_registerName(selector), *values)

    pool = send(objc.objc_getClass(b"NSAutoreleasePool"), b"new")
    try:
        string = send(objc.objc_getClass(b"NSString"), b"stringWithUTF8String:",
                      argtypes=(c.c_char_p,), values=(os.fsencode(FILE),))
        url = send(objc.objc_getClass(b"NSURL"), b"fileURLWithPath:",
                   argtypes=(c.c_void_p,), values=(string,))
        manager = send(objc.objc_getClass(b"NSFileManager"), b"defaultManager")
        assert string and url and manager
        if sys.argv[1:] == ["--metadata-only"]:
            metadata = {}
            for symbol in ["NSURLIsUbiquitousItemKey", "NSURLUbiquitousItemDownloadingStatusKey",
                           "NSURLUbiquitousItemDownloadingErrorKey"]:
                key = c.c_void_p.in_dll(foundation, symbol).value
                value, lookup_error = c.c_void_p(), c.c_void_p()
                ok = send(url, b"getResourceValue:forKey:error:", result=c.c_bool,
                          argtypes=(c.POINTER(c.c_void_p), c.c_void_p, c.POINTER(c.c_void_p)),
                          values=(c.byref(value), key, c.byref(lookup_error)))
                if not ok or not value.value:
                    metadata[symbol] = {"available": False,
                                        "lookupErrorCode": send(lookup_error.value, b"code", result=c.c_long)
                                        if lookup_error.value else None}
                elif symbol == "NSURLIsUbiquitousItemKey":
                    metadata[symbol] = bool(send(value.value, b"boolValue", result=c.c_bool))
                elif symbol.endswith("StatusKey"):
                    text = send(value.value, b"UTF8String", result=c.c_char_p).decode("utf8")
                    metadata[symbol] = text if text.startswith("NSURLUbiquitousItemDownloadingStatus") else "OTHER_STATUS"
                else:
                    metadata[symbol] = {"downloadErrorCode": send(value.value, b"code", result=c.c_long)}
            print(json.dumps({"metadata": metadata, "contentsRead": False}))
            return
        assert not sys.argv[1:]
        error = c.c_void_p()
        guard()
        accepted = send(manager, b"startDownloadingUbiquitousItemAtURL:error:",
                        result=c.c_bool, argtypes=(c.c_void_p, c.POINTER(c.c_void_p)),
                        values=(url, c.byref(error)))
        code = send(error.value, b"code", result=c.c_long) if error.value else None
        print(json.dumps({"downloadRequestAccepted": accepted, "errorCode": code,
                          "contentsRead": False}), flush=True)
        if accepted:
            deadline = time.monotonic() + 25
            while time.monotonic() < deadline:
                guard()
                if downloaded():
                    print(json.dumps({"status": "LOCAL_AVAILABLE", "contentsRead": False}))
                    return
                time.sleep(1)
        print(json.dumps({"status": "STILL_DATALESS_HOLD", "contentsRead": False}))
    finally:
        send(pool, b"drain", result=None)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Adds the three Screen Time app-extension targets to ios/App/App.xcodeproj.

Why a script and not hand-editing: project.pbxproj is a graph of objects linked
by 24-hex-character ids, and adding one target touches nine sections. Doing that
by hand once is error-prone; doing it by hand twice is worse. This is
deterministic — ids are derived from a label, so re-running produces the same
file and the diff is reviewable.

Why a script and not Xcode: there is no Mac here. mod-pbxproj, which is the
library for this, cannot create targets at all — only add files to existing
ones. So the objects are constructed directly.

    python scripts/addScreenTimeTargets.py

Idempotent: exits without changes if the targets are already present.
"""

import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PBX = os.path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj")
EXTENSIONS_JSON = os.path.join(ROOT, "scripts/screenTimeExtensions.json")

APP_ID = "com.medladder.app"
APP_GROUP = "group." + APP_ID
DEPLOYMENT = "16.0"

# The App target and project object ids, read out of the file rather than
# assumed, so this does not silently target the wrong thing if Capacitor
# regenerates the project.
APP_TARGET_RE = re.compile(r"([0-9A-F]{24}) /\* App \*/ = \{\s*isa = PBXNativeTarget;")
PROJECT_RE = re.compile(r"([0-9A-F]{24}) /\* Project object \*/")
PRODUCTS_GROUP_RE = re.compile(r"([0-9A-F]{24}) /\* Products \*/")
MAIN_GROUP_RE = re.compile(r"mainGroup = ([0-9A-F]{24});")
APP_SOURCES_RE = re.compile(r"([0-9A-F]{24}) /\* Sources \*/ = \{\s*isa = PBXSourcesBuildPhase;")


def uid(label):
    """Deterministic 24-hex id. Derived from the label so the same run always
    produces the same file, which is what makes the diff reviewable."""
    return hashlib.sha1(("medladder-screentime:" + label).encode()).hexdigest()[:24].upper()


# NSExtensionPointIdentifier values. These are NOT guessable and a wrong one
# means the extension never loads, or is rejected at upload with
# "Invalid NSExtensionPointIdentifier" — which is what happened to both of the
# first two entries below, on a real App Store Connect submission.
#
# The bug in the previous version of this comment was generalising from one
# confirmed case to two. The shield-action identifier was confirmed directly
# by an Apple DTS engineer (developer.apple.com/forums/thread/814945) as
# ManagedSettings, not ManagedSettingsUI — correct, and never flagged across
# two uploads. That got written down as a rule for "the shield services"
# (plural) and applied by pattern-matching to shield-configuration too, which
# was wrong: ShieldConfigurationDataSource is documented under the
# ManagedSettingsUI framework specifically (developer.apple.com/documentation/
# ManagedSettingsUI/ShieldConfigurationDataSource), a different framework from
# ShieldActionDelegate, and its extension point uses that prefix — confirmed
# by a second Apple engineer, developer.apple.com/forums/thread/683110.
# Monitor's rejection was unrelated: missing the "-extension" suffix, confirmed
# against developer.apple.com/forums/thread/822083 and 681963.
#
# Each of these three is independent. Do not infer one from another again —
# verify each on its own, ideally against Apple's own sample project or a
# forum answer explicitly attributed to an Apple engineer.
#
# The values themselves live in screenTimeExtensions.json, not here, and
# validate.js's Xcode-project guard reads the same file. They used to be a
# literal list here AND a second hardcoded copy in validate.js — which is
# exactly how the shield-configuration fix above could have landed in one
# file and not the other. One file now; a wrong value is wrong in both places
# by construction, and there is nothing left to keep in sync by hand.
with open(EXTENSIONS_JSON, encoding="utf-8") as f:
    EXTENSIONS = json.load(f)

SHARED = "../ScreenTime/Shared/StudyGate.swift"
PLUGIN = "../ScreenTime/Shared/ScreenTimePlugin.swift"

INFO_PLIST = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDisplayName</key>
\t<string>{name}</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>XPC!</string>
\t<key>CFBundleShortVersionString</key>
\t<string>$(MARKETING_VERSION)</string>
\t<key>CFBundleVersion</key>
\t<string>$(CURRENT_PROJECT_VERSION)</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>{point}</string>
\t\t<key>NSExtensionPrincipalClass</key>
\t\t<string>$(PRODUCT_MODULE_NAME).{principal}</string>
\t</dict>
</dict>
</plist>
"""

ENTITLEMENTS = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.family-controls</key>
\t<true/>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>{group}</string>
\t</array>
</dict>
</plist>
"""


def write_support_files():
    """Info.plist and entitlements per target. Written before the project is
    touched, so a failure here leaves the project untouched."""
    made = []
    for ext in EXTENSIONS:
        d = os.path.join(ROOT, "ios/ScreenTime", ext["group"])
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "Info.plist")
        with open(p, "w", newline="\n") as f:
            f.write(INFO_PLIST.format(name=ext["name"], point=ext["point"], principal=ext["principal"]))
        made.append(p)
        e = os.path.join(d, ext["name"] + ".entitlements")
        with open(e, "w", newline="\n") as f:
            f.write(ENTITLEMENTS.format(group=APP_GROUP))
        made.append(e)
    # The app itself needs the same two capabilities.
    appent = os.path.join(ROOT, "ios/App/App/App.entitlements")
    with open(appent, "w", newline="\n") as f:
        f.write(ENTITLEMENTS.format(group=APP_GROUP))
    made.append(appent)
    return made


def build_settings(ext, config):
    return f"""\t\t\t\tCODE_SIGN_ENTITLEMENTS = "../ScreenTime/{ext['group']}/{ext['name']}.entitlements";
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = "../ScreenTime/{ext['group']}/Info.plist";
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = {DEPLOYMENT};
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t\t"@executable_path/../../Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = {APP_ID}.{ext['bundle_suffix']};
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";"""


def insert(text, section, body):
    """Append into a named pbxproj section, before its End marker."""
    marker = f"/* End {section} section */"
    if marker not in text:
        raise SystemExit(f"section {section} not found — refusing to write")
    return text.replace(marker, body + marker)


def main():
    with open(PBX, "r", encoding="utf-8") as f:
        text = f.read()

    # write_support_files() runs unconditionally, ahead of the idempotency
    # check below. It is naturally idempotent — deterministic content to fixed
    # paths — so re-running costs nothing, and a fix to the plist/entitlements
    # templates (like the missing CFBundleExecutable this was written to add)
    # needs to reach disk even when the pbxproj mutation is skipped as already
    # done. Without this, a re-run would silently apply nothing.
    write_support_files()

    if "StudyGateMonitor.swift" in text:
        print("targets already present in project.pbxproj — support files rewritten, project untouched")
        return

    app_target = APP_TARGET_RE.search(text)
    project = PROJECT_RE.search(text)
    products = PRODUCTS_GROUP_RE.search(text)
    main_group = MAIN_GROUP_RE.search(text)
    app_sources = APP_SOURCES_RE.search(text)
    for label, m in [
        ("App target", app_target),
        ("Project object", project),
        ("Products group", products),
        ("mainGroup", main_group),
        ("App Sources phase", app_sources),
    ]:
        if not m:
            raise SystemExit(f"could not locate {label} in project.pbxproj — refusing to write")
    app_target, project = app_target.group(1), project.group(1)
    products, main_group, app_sources = products.group(1), main_group.group(1), app_sources.group(1)

    build_files, file_refs, groups, phases, configs, conf_lists = [], [], [], [], [], []
    targets, deps, proxies, embed_files, group_children = [], [], [], [], []

    # StudyGate.swift is shared by all four targets. One PBXFileReference, one
    # PBXBuildFile per target — a build file belongs to exactly one phase, so
    # four targets need four of them off the same reference.
    shared_ref = uid("ref:shared")
    file_refs.append(
        f'\t\t{shared_ref} /* StudyGate.swift */ = {{isa = PBXFileReference; '
        f'lastKnownFileType = sourcecode.swift; name = StudyGate.swift; path = "{SHARED}"; '
        f"sourceTree = \"<group>\"; }};\n"
    )
    plugin_ref = uid("ref:plugin")
    file_refs.append(
        f'\t\t{plugin_ref} /* ScreenTimePlugin.swift */ = {{isa = PBXFileReference; '
        f'lastKnownFileType = sourcecode.swift; name = ScreenTimePlugin.swift; path = "{PLUGIN}"; '
        f"sourceTree = \"<group>\"; }};\n"
    )

    # Shared + plugin into the App target's own Sources phase.
    app_shared_bf = uid("bf:app:shared")
    app_plugin_bf = uid("bf:app:plugin")
    build_files.append(
        f"\t\t{app_shared_bf} /* StudyGate.swift in Sources */ = {{isa = PBXBuildFile; "
        f"fileRef = {shared_ref} /* StudyGate.swift */; }};\n"
    )
    build_files.append(
        f"\t\t{app_plugin_bf} /* ScreenTimePlugin.swift in Sources */ = {{isa = PBXBuildFile; "
        f"fileRef = {plugin_ref} /* ScreenTimePlugin.swift */; }};\n"
    )

    shared_group_children = [
        f"\t\t\t\t{shared_ref} /* StudyGate.swift */,\n",
        f"\t\t\t\t{plugin_ref} /* ScreenTimePlugin.swift */,\n",
    ]

    for ext in EXTENSIONS:
        n = ext["name"]
        t_id = uid(f"target:{n}")
        prod_ref = uid(f"prod:{n}")
        src_phase = uid(f"srcphase:{n}")
        fw_phase = uid(f"fwphase:{n}")
        res_phase = uid(f"resphase:{n}")
        conf_list = uid(f"conflist:{n}")
        dbg = uid(f"debug:{n}")
        rel = uid(f"release:{n}")
        dep = uid(f"dep:{n}")
        proxy = uid(f"proxy:{n}")
        grp = uid(f"group:{n}")
        plist_ref = uid(f"plist:{n}")
        ent_ref = uid(f"ent:{n}")

        # product
        file_refs.append(
            f'\t\t{prod_ref} /* {n}.appex */ = {{isa = PBXFileReference; explicitFileType = '
            f'"wrapper.app-extension"; includeInIndex = 0; path = {n}.appex; '
            f"sourceTree = BUILT_PRODUCTS_DIR; }};\n"
        )
        file_refs.append(
            f'\t\t{plist_ref} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = '
            f'text.plist.xml; name = Info.plist; path = "../ScreenTime/{ext["group"]}/Info.plist"; '
            f"sourceTree = \"<group>\"; }};\n"
        )
        file_refs.append(
            f'\t\t{ent_ref} /* {n}.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = '
            f'text.plist.entitlements; name = {n}.entitlements; '
            f'path = "../ScreenTime/{ext["group"]}/{n}.entitlements"; sourceTree = "<group>"; }};\n'
        )

        # sources
        src_bfs = []
        children = [
            f"\t\t\t\t{plist_ref} /* Info.plist */,\n",
            f"\t\t\t\t{ent_ref} /* {n}.entitlements */,\n",
        ]
        for src in ext["sources"]:
            base = os.path.basename(src)
            r = uid(f"ref:{n}:{base}")
            b = uid(f"bf:{n}:{base}")
            file_refs.append(
                f"\t\t{r} /* {base} */ = {{isa = PBXFileReference; lastKnownFileType = "
                f'sourcecode.swift; name = {base}; path = "{src}"; sourceTree = "<group>"; }};\n'
            )
            build_files.append(
                f"\t\t{b} /* {base} in Sources */ = {{isa = PBXBuildFile; fileRef = {r} /* {base} */; }};\n"
            )
            src_bfs.append(f"\t\t\t\t{b} /* {base} in Sources */,\n")
            children.append(f"\t\t\t\t{r} /* {base} */,\n")

        # StudyGate.swift, again, for this target
        shared_bf = uid(f"bf:{n}:shared")
        build_files.append(
            f"\t\t{shared_bf} /* StudyGate.swift in Sources */ = {{isa = PBXBuildFile; "
            f"fileRef = {shared_ref} /* StudyGate.swift */; }};\n"
        )
        src_bfs.append(f"\t\t\t\t{shared_bf} /* StudyGate.swift in Sources */,\n")

        groups.append(
            f"\t\t{grp} /* {n} */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n"
            + "".join(children)
            + f"\t\t\t);\n\t\t\tname = {n};\n\t\t\tsourceTree = \"<group>\";\n\t\t}};\n"
        )
        group_children.append(f"\t\t\t\t{grp} /* {n} */,\n")

        phases.append(
            f"\t\t{src_phase} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n"
            f"\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n"
            + "".join(src_bfs)
            + "\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n"
        )

        configs.append(
            f"\t\t{dbg} /* Debug */ = {{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {{\n"
            + build_settings(ext, "Debug")
            + "\n\t\t\t};\n\t\t\tname = Debug;\n\t\t};\n"
        )
        configs.append(
            f"\t\t{rel} /* Release */ = {{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {{\n"
            + build_settings(ext, "Release")
            + "\n\t\t\t};\n\t\t\tname = Release;\n\t\t};\n"
        )
        conf_lists.append(
            f'\t\t{conf_list} /* Build configuration list for PBXNativeTarget "{n}" */ = {{\n'
            f"\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n"
            f"\t\t\t\t{dbg} /* Debug */,\n\t\t\t\t{rel} /* Release */,\n"
            f"\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n"
            f"\t\t\tdefaultConfigurationName = Release;\n\t\t}};\n"
        )

        targets.append(
            f"\t\t{t_id} /* {n} */ = {{\n\t\t\tisa = PBXNativeTarget;\n"
            f'\t\t\tbuildConfigurationList = {conf_list} /* Build configuration list for PBXNativeTarget "{n}" */;\n'
            f"\t\t\tbuildPhases = (\n\t\t\t\t{src_phase} /* Sources */,\n\t\t\t\t{fw_phase} /* Frameworks */,\n"
            f"\t\t\t\t{res_phase} /* Resources */,\n\t\t\t);\n"
            f"\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);\n"
            f"\t\t\tname = {n};\n\t\t\tproductName = {n};\n"
            f"\t\t\tproductReference = {prod_ref} /* {n}.appex */;\n"
            f'\t\t\tproductType = "com.apple.product-type.app-extension";\n\t\t}};\n'
        )
        phases.append(
            f"\t\t{fw_phase} /* Frameworks */ = {{\n\t\t\tisa = PBXFrameworksBuildPhase;\n"
            f"\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n"
            f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n"
        )
        phases.append(
            f"\t\t{res_phase} /* Resources */ = {{\n\t\t\tisa = PBXResourcesBuildPhase;\n"
            f"\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n"
            f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n"
        )

        # The app depends on each extension and embeds it.
        proxies.append(
            f"\t\t{proxy} /* PBXContainerItemProxy */ = {{\n\t\t\tisa = PBXContainerItemProxy;\n"
            f"\t\t\tcontainerPortal = {project} /* Project object */;\n\t\t\tproxyType = 1;\n"
            f"\t\t\tremoteGlobalIDString = {t_id};\n\t\t\tremoteInfo = {n};\n\t\t}};\n"
        )
        deps.append(
            f"\t\t{dep} /* PBXTargetDependency */ = {{\n\t\t\tisa = PBXTargetDependency;\n"
            f"\t\t\ttarget = {t_id} /* {n} */;\n"
            f"\t\t\ttargetProxy = {proxy} /* PBXContainerItemProxy */;\n\t\t}};\n"
        )
        embed_bf = uid(f"embed:{n}")
        build_files.append(
            f"\t\t{embed_bf} /* {n}.appex in Embed Foundation Extensions */ = {{isa = PBXBuildFile; "
            f"fileRef = {prod_ref} /* {n}.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};\n"
        )
        embed_files.append(f"\t\t\t\t{embed_bf} /* {n}.appex in Embed Foundation Extensions */,\n")
        products_children = f"\t\t\t\t{prod_ref} /* {n}.appex */,\n"
        text = text.replace(
            f"{products} /* Products */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n",
            f"{products} /* Products */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n" + products_children,
        )
        text = text.replace(
            f"\t\t\ttargets = (\n",
            f"\t\t\ttargets = (\n\t\t\t\t{t_id} /* {n} */,\n",
        )
        text = text.replace(
            "\t\t\t\tTargetAttributes = {\n",
            f"\t\t\t\tTargetAttributes = {{\n\t\t\t\t\t{t_id} = {{\n"
            f"\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;\n\t\t\t\t\t\tProvisioningStyle = Automatic;\n\t\t\t\t\t}};\n",
        )
        text = text.replace(
            f"\t\t{app_target} /* App */ = {{\n\t\t\tisa = PBXNativeTarget;",
            f"\t\t{app_target} /* App */ = {{\n\t\t\tisa = PBXNativeTarget;",
        )
        # dependency on the app target
        text = re.sub(
            r"(" + app_target + r" /\* App \*/ = \{[\s\S]*?dependencies = \(\n)",
            r"\1" + f"\t\t\t\t{dep} /* PBXTargetDependency */,\n",
            text,
            count=1,
        )

    # Embed phase on the App target.
    embed_phase = uid("embedphase")
    phases.append(
        f"\t\t{embed_phase} /* Embed Foundation Extensions */ = {{\n"
        f"\t\t\tisa = PBXCopyFilesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n"
        f'\t\t\tdstPath = "";\n\t\t\tdstSubfolderSpec = 13;\n\t\t\tfiles = (\n'
        + "".join(embed_files)
        + '\t\t\t);\n\t\t\tname = "Embed Foundation Extensions";\n'
        f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n"
    )
    text = re.sub(
        r"(" + app_target + r" /\* App \*/ = \{[\s\S]*?" + app_sources + r" /\* Sources \*/,\n)",
        r"\1",
        text,
        count=1,
    )
    text = re.sub(
        r"(" + app_target + r" /\* App \*/ = \{[\s\S]*?/\* Resources \*/,\n)",
        r"\1" + f"\t\t\t\t{embed_phase} /* Embed Foundation Extensions */,\n",
        text,
        count=1,
    )

    # Shared sources into the App target's Sources phase.
    text = re.sub(
        r"(" + app_sources + r" /\* Sources \*/ = \{[\s\S]*?files = \(\n)",
        r"\1"
        + f"\t\t\t\t{app_shared_bf} /* StudyGate.swift in Sources */,\n"
        + f"\t\t\t\t{app_plugin_bf} /* ScreenTimePlugin.swift in Sources */,\n",
        text,
        count=1,
    )

    # A group holding the shared files, under the main group.
    shared_group = uid("group:Shared")
    groups.append(
        f"\t\t{shared_group} /* ScreenTime */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n"
        + "".join(shared_group_children)
        + "".join(group_children)
        + f"\t\t\t);\n\t\t\tname = ScreenTime;\n\t\t\tsourceTree = \"<group>\";\n\t\t}};\n"
    )
    text = re.sub(
        r"(" + main_group + r" = \{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = \(\n)",
        r"\1" + f"\t\t\t\t{shared_group} /* ScreenTime */,\n",
        text,
        count=1,
    )

    # App entitlements on both configurations of the App target.
    text = re.sub(
        r"(PRODUCT_BUNDLE_IDENTIFIER = com\.medladder\.app;)",
        'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\t\\1',
        text,
    )

    text = insert(text, "PBXBuildFile", "".join(build_files))
    text = insert(text, "PBXFileReference", "".join(file_refs))
    text = insert(text, "PBXGroup", "".join(groups))
    text = insert(text, "PBXNativeTarget", "".join(targets))
    text = insert(text, "XCBuildConfiguration", "".join(configs))
    text = insert(text, "XCConfigurationList", "".join(conf_lists))

    # These sections may not exist yet in a project with one plain target.
    for section, body in [
        ("PBXSourcesBuildPhase", ""),
        ("PBXTargetDependency", "".join(deps)),
        ("PBXContainerItemProxy", "".join(proxies)),
    ]:
        marker = f"/* End {section} section */"
        if marker in text:
            if body:
                text = text.replace(marker, body + marker)
        elif body:
            text = text.replace(
                "/* Begin PBXFileReference section */",
                f"/* Begin {section} section */\n{body}/* End {section} section */\n\n"
                "/* Begin PBXFileReference section */",
            )

    # Phases go into their own sections, each of which may be new.
    for phase_body, section in [
        (
            "".join(p for p in phases if "PBXSourcesBuildPhase" in p),
            "PBXSourcesBuildPhase",
        ),
        (
            "".join(p for p in phases if "PBXFrameworksBuildPhase" in p),
            "PBXFrameworksBuildPhase",
        ),
        (
            "".join(p for p in phases if "PBXResourcesBuildPhase" in p),
            "PBXResourcesBuildPhase",
        ),
        (
            "".join(p for p in phases if "PBXCopyFilesBuildPhase" in p),
            "PBXCopyFilesBuildPhase",
        ),
    ]:
        if not phase_body:
            continue
        marker = f"/* End {section} section */"
        if marker in text:
            text = text.replace(marker, phase_body + marker)
        else:
            text = text.replace(
                "/* Begin PBXFileReference section */",
                f"/* Begin {section} section */\n{phase_body}/* End {section} section */\n\n"
                "/* Begin PBXFileReference section */",
            )

    with open(PBX, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(f"added {len(EXTENSIONS)} targets")
    for ext in EXTENSIONS:
        print(f"  {ext['name']:<20} {APP_ID}.{ext['bundle_suffix']:<14} {ext['point']}")


if __name__ == "__main__":
    main()

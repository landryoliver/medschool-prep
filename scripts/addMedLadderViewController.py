#!/usr/bin/env python3
"""
Adds MedLadderViewController.swift to the App target's Sources build phase.

Same reasoning as addScreenTimeTargets.py: project.pbxproj is a graph of
objects linked by 24-hex ids, editing it by hand is how it gets corrupted, and
there is no Mac here to do this from Xcode's UI instead. Deterministic ids
(sha1 of a fixed label) make re-running produce the same file, and idempotent
so this can be re-run safely.

    python scripts/addMedLadderViewController.py
"""

import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PBX = os.path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj")


def uid(label):
    return hashlib.sha1(("medladder-vc:" + label).encode()).hexdigest()[:24].upper()


def main():
    with open(PBX, "r", encoding="utf-8") as f:
        text = f.read()

    if "MedLadderViewController.swift" in text:
        print("MedLadderViewController.swift already present — nothing to do")
        return

    build_id = uid("build")
    ref_id = uid("ref")

    build_entry = f'\t\t{build_id} /* MedLadderViewController.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {ref_id} /* MedLadderViewController.swift */; }};\n'
    ref_entry = f'\t\t{ref_id} /* MedLadderViewController.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MedLadderViewController.swift; sourceTree = "<group>"; }};\n'

    # PBXBuildFile section: append after the existing AppDelegate.swift entry,
    # which anchors this to the App target's own build-file list rather than
    # an extension's.
    anchor = '\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };\n'
    if text.count(anchor) != 1:
        raise SystemExit("AppDelegate.swift PBXBuildFile anchor not found or not unique — refusing to write")
    text = text.replace(anchor, anchor + build_entry)

    # PBXFileReference section: same anchor pattern, the FileReference form.
    ref_anchor = '\t\t504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };\n'
    if text.count(ref_anchor) != 1:
        raise SystemExit("AppDelegate.swift PBXFileReference anchor not found or not unique — refusing to write")
    text = text.replace(ref_anchor, ref_anchor + ref_entry)

    # The App group (so it shows up in Xcode's navigator next to the other
    # App-only files). AppDelegate.swift's own reference id inside a group
    # children list is the anchor.
    group_anchor = "504EC3071FED79650016851F /* AppDelegate.swift */,\n"
    if text.count(group_anchor) != 1:
        raise SystemExit("AppDelegate.swift group-children anchor not found or not unique — refusing to write")
    text = text.replace(group_anchor, group_anchor + f"\t\t\t\t{ref_id} /* MedLadderViewController.swift */,\n")

    # The App target's own Sources build phase — same phase id identified
    # earlier as containing AppDelegate.swift and SceneDelegate.swift.
    sources_anchor = "504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n"
    if text.count(sources_anchor) != 1:
        raise SystemExit("AppDelegate.swift Sources-phase anchor not found or not unique — refusing to write")
    text = text.replace(sources_anchor, sources_anchor + f"\t\t\t\t{build_id} /* MedLadderViewController.swift in Sources */,\n")

    with open(PBX, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print("MedLadderViewController.swift added to the App target")


if __name__ == "__main__":
    main()

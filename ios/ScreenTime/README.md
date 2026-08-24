# Screen Time gate — Xcode setup

These files are **not in the Xcode project yet**. They were written without a
Mac, so none of them has been compiled. `project.pbxproj` was deliberately left
alone: hand-editing it to add three extension targets, without being able to
open Xcode and see the result, risks a corrupted project discovered on a rented
machine — which is a worse failure than doing this part by hand once.

`npm run validate` does check what it can across the language boundary: the
record's field names against what the JS sends, the plugin's declared methods
against both its own implementations and the JS call sites, the App Group id
against the bundle id, the day-stamp format, and that every monitor callback
ends in `reconcile()`. All of that is text analysis. **None of it is a compile.**

## 1. Identifiers (Apple Developer portal)

App Group `group.com.medladder.app`, and three new App IDs:

| target | bundle id |
|---|---|
| monitor | `com.medladder.app.monitor` |
| shield configuration | `com.medladder.app.shield` |
| shield action | `com.medladder.app.shieldaction` |

Every one of the four — app included — needs **App Groups** and
**Family Controls**. The App Group must be the same on all four.

## 2. Targets (Xcode)

Three targets, File → New → Target:

1. **Device Activity Monitor Extension** → name `Monitor`
2. **Shield Configuration Extension** → name `ShieldConfiguration`
3. **Shield Action Extension** → name `ShieldAction`

Then add the sources. `Shared/StudyGate.swift` has to be a member of **all
four** targets — app, monitor, and both shields.

| file | targets |
|---|---|
| `Shared/StudyGate.swift` | App, Monitor, ShieldConfiguration, ShieldAction |
| `Shared/ScreenTimePlugin.swift` | App only |
| `MonitorExtension/StudyGateMonitor.swift` | Monitor |
| `ShieldConfiguration/StudyGateShield.swift` | ShieldConfiguration |
| `ShieldAction/StudyGateShieldAction.swift` | ShieldAction |

Target membership is the thing to be careful about. Referencing a shared symbol
from extension code means adding its file — and everything that file imports —
to that target, and Xcode reports the failure as *"cannot find X in scope"*,
which reads like a typo and is not one.

Each extension's `Info.plist` needs its principal class pointed at the class in
this folder rather than the template's.

## 3. Capabilities

For all four targets: **App Groups** (`group.com.medladder.app`) and
**Family Controls**.

## 4. What to expect the first time

- **Nothing happens at all** → almost certainly authorization. `.individual`
  authorization has to be granted once, and it can be revoked in Settings at any
  moment with no callback, which is why `status()` is read on every foreground.
- **A shield that will not lift** → the record is not arriving. `shouldShield()`
  treats a missing or stale record as *unproven*, which means shielded. That is
  the deliberate direction: the other default makes every missed callback a free
  pass. Check that `pushRecord` is being called.
- **Works in the app, does nothing from an extension** → `UserDefaults.standard`
  somewhere. It writes successfully and reads back `nil`, with no error. Only
  `AppGroup.defaults` is correct.
- **Blocked app opens anyway, late at night** → the monitor exceeded its ~6 MB
  and was jetsammed mid-callback. No crash report, no log. Nothing in this
  folder imports SwiftUI or anything heavy into the monitor target; keep it that
  way.

## 5. None of this runs in the Simulator

Family Controls is device-only. Until it is on a physical phone none of it can
be executed at all, which was the most expensive constraint on WakeHard and is
the same one here.

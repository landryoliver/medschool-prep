import Foundation
import FamilyControls
import ManagedSettings

// The ONE App Group accessor. Everything shared goes through this and nothing
// touches UserDefaults.standard.
//
// An extension writing to .standard succeeds and the app reads back nil — no
// exception, no warning. The symptom is a feature that works in the app and
// silently does nothing from the extension, with every log line insisting the
// value was written.
public enum AppGroup {
    public static let id = "group.com.medladder.app"
    public static let defaults = UserDefaults(suiteName: id)!
}

public extension ManagedSettingsStore.Name {
    // One store for the one rule. If a second independent rule ever appears it
    // gets its own name — sharing a store means clearAllSettings() for one
    // reason quietly unshields everything.
    static let studyGate = Self("studyGate")
}

public extension DeviceActivityName {
    static let distractions = Self("distractions")
}

public extension DeviceActivityEvent.Name {
    static let ceilingReached = Self("ceilingReached")
}

/// What the app tells the extensions about today. Deliberately tiny: the
/// monitor runs in about 6 MB and is killed between callbacks, so it must read
/// one record and compare two fields rather than compute anything.
public struct StudyRecord: Codable {
    public let day: String          // "YYYY-MM-DD", local
    public let floorMet: Bool
    public let answered: Int
    public let goal: Int
    public let expiresAt: Double    // ms since epoch, first instant of tomorrow

    public init(day: String, floorMet: Bool, answered: Int, goal: Int, expiresAt: Double) {
        self.day = day
        self.floorMet = floorMet
        self.answered = answered
        self.goal = goal
        self.expiresAt = expiresAt
    }

    // Hand-written, every field decodeIfPresent with a default. Synthesised
    // Codable plus one new non-optional property, shipped as an update, means
    // every existing record fails to decode and vanishes — no crash, the goals
    // are just gone one morning.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        day = try c.decodeIfPresent(String.self, forKey: .day) ?? ""
        floorMet = try c.decodeIfPresent(Bool.self, forKey: .floorMet) ?? false
        answered = try c.decodeIfPresent(Int.self, forKey: .answered) ?? 0
        goal = try c.decodeIfPresent(Int.self, forKey: .goal) ?? 0
        expiresAt = try c.decodeIfPresent(Double.self, forKey: .expiresAt) ?? 0
    }

    /// A record for a day that has ended, or one whose stamp disagrees with the
    /// clock. Both matter: the expiry catches a callback firing after midnight,
    /// and the day stamp catches a record left inconsistent by a timezone or
    /// clock change, where the expiry has not passed but the day is wrong.
    public func isStale(now: Date = Date()) -> Bool {
        if day.isEmpty { return true }
        if day != StudyGate.dayStamp(now) { return true }
        return now.timeIntervalSince1970 * 1000 >= expiresAt
    }
}

public enum StudyGate {
    private static let recordKey = "studyRecord"
    private static let selectionKey = "shieldSelection"
    private static let armedKey = "gateArmed"
    private static let ceilingKey = "ceilingMinutes"
    private static let unlockLogKey = "unlockLog"
    private static let overrideKey = "overrideUntil"

    // Must match src/lib/day.js. Local midnight, because the user is one person
    // in one timezone and a UTC day would roll over mid-afternoon for them.
    public static func dayStamp(_ date: Date = Date()) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    // MARK: - the record

    public static func save(record: StudyRecord) {
        guard let data = try? JSONEncoder().encode(record) else { return }
        AppGroup.defaults.set(data, forKey: recordKey)
    }

    public static func record() -> StudyRecord? {
        guard let data = AppGroup.defaults.data(forKey: recordKey) else { return nil }
        return try? JSONDecoder().decode(StudyRecord.self, from: data)
    }

    // MARK: - config

    public static var armed: Bool {
        get { AppGroup.defaults.bool(forKey: armedKey) }
        set { AppGroup.defaults.set(newValue, forKey: armedKey) }
    }

    /// When a bounded override expires. Stored rather than held, because the
    /// shield action extension sets it and the monitor extension and the app
    /// both read it, and none of the three share memory.
    public static var overrideUntil: Date? {
        get {
            let t = AppGroup.defaults.double(forKey: overrideKey)
            return t > 0 ? Date(timeIntervalSince1970: t) : nil
        }
        set { AppGroup.defaults.set(newValue?.timeIntervalSince1970 ?? 0, forKey: overrideKey) }
    }

    public static var ceilingMinutes: Int {
        get {
            let v = AppGroup.defaults.integer(forKey: ceilingKey)
            return v > 0 ? v : 45
        }
        set { AppGroup.defaults.set(newValue, forKey: ceilingKey) }
    }

    public static func save(selection: FamilyActivitySelection) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        AppGroup.defaults.set(data, forKey: selectionKey)
    }

    /// Tokens are scoped to the install and the device, so a reinstall — and
    /// sometimes a restore — invalidates them. An empty-but-configured state is
    /// detectable via `armed == true` with an empty selection, and the app
    /// should ask for a re-pick rather than silently enforcing nothing.
    public static func selection() -> FamilyActivitySelection {
        guard let data = AppGroup.defaults.data(forKey: selectionKey),
              let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return sel
    }

    public static var selectionIsEmpty: Bool {
        let s = selection()
        return s.applicationTokens.isEmpty && s.categoryTokens.isEmpty && s.webDomainTokens.isEmpty
    }

    // MARK: - the decision

    /// Should the set be shielded right now, given only stored state and the
    /// clock? Pure, so it can be called from anywhere without side effects.
    ///
    /// A missing or stale record means the day is unproven, NOT that it is
    /// satisfied. Defaulting the other way would make every missed callback and
    /// every midnight a free pass.
    public static func shouldShield(now: Date = Date()) -> Bool {
        guard armed, !selectionIsEmpty else { return false }
        // A live override wins over everything. Checked before the record so an
        // override cannot be defeated by the record going stale underneath it.
        if let until = overrideUntil, now < until { return false }
        guard let r = record(), !r.isStale(now: now) else { return true }
        return !r.floorMet
    }

    /// The one idempotent function that makes this survivable. Every entry
    /// point calls it: app launch, every foreground, and the tail of every
    /// callback. If a callback is missed the next foreground fixes it; if one
    /// arrives twice the second is a no-op.
    ///
    /// State that is derived cannot desynchronise, which is the only defence
    /// against schedules that skip, callbacks that land after the window they
    /// describe, and monitoring that does not resume after a reboot.
    public static func reconcile(now: Date = Date()) {
        let store = ManagedSettingsStore(named: .studyGate)
        guard shouldShield(now: now) else {
            store.clearAllSettings()
            return
        }
        let sel = selection()
        store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
        store.shield.applicationCategories = sel.categoryTokens.isEmpty
            ? nil
            : .specific(sel.categoryTokens)
        store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
        // Without this, moving the device clock forward defeats every schedule
        // and every expiry check above.
        store.dateAndTime.requireAutomaticDateAndTime = true
    }

    // MARK: - the escape hatch, recorded

    /// Append-only. An escape hatch that is not recorded is one you use without
    /// noticing you use it.
    public static func logUnlock(reason: String, now: Date = Date()) {
        var log = AppGroup.defaults.array(forKey: unlockLogKey) as? [[String: Any]] ?? []
        log.append(["at": now.timeIntervalSince1970 * 1000, "reason": reason, "day": dayStamp(now)])
        // Bounded, because this is read by a 6 MB extension.
        if log.count > 200 { log.removeFirst(log.count - 200) }
        AppGroup.defaults.set(log, forKey: unlockLogKey)
    }
}

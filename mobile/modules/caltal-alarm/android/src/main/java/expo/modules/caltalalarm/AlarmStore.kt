package expo.modules.caltalalarm

import android.content.Context

// The ringing reminders still to come, saved on the phone. Android forgets
// every scheduled alarm when the phone restarts; this list is how they're put
// back (BootReceiver). commit() rather than apply(): a receiver's process can
// be stopped straight after it returns, before a background save finishes.
object AlarmStore {
  private const val PREFERENCES = "caltal_alarms"

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  fun put(context: Context, alarm: Alarm) {
    preferences(context).edit().putString(alarm.id, alarm.toJson()).commit()
  }

  fun get(context: Context, id: String): Alarm? =
    Alarm.fromJson(preferences(context).getString(id, null))

  fun remove(context: Context, id: String) {
    preferences(context).edit().remove(id).commit()
  }

  fun all(context: Context): List<Alarm> =
    preferences(context).all.values.mapNotNull { Alarm.fromJson(it as? String) }
}

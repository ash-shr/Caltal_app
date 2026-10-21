package expo.modules.caltalalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

// Hands ringing reminders to Android's AlarmManager, which wakes the phone at
// the exact moment even when Caltal is closed and the phone is asleep.
object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.caltalalarm.FIRE"
  const val EXTRA_ID = "id"

  // A snoozed reminder's id starts with this. Caltal's regular reschedule
  // (replaceScheduled) leaves those alone, so opening the app mid-snooze
  // doesn't cancel the snooze.
  const val SNOOZE_PREFIX = "snooze:"

  // The "Send a test" reminder from Settings, also left alone by a reschedule
  const val TEST_ID = "test"

  fun schedule(context: Context, alarm: Alarm) {
    AlarmStore.put(context, alarm)
    setExact(context, alarm.at, fireIntent(context, alarm.id))
  }

  fun cancel(context: Context, id: String) {
    alarmManager(context).cancel(fireIntent(context, id))
    AlarmStore.remove(context, id)
  }

  // Swaps the scheduled reminders for this list. Snoozed ones and a pending
  // test stay.
  fun replaceScheduled(context: Context, alarms: List<Alarm>) {
    for (existing in AlarmStore.all(context)) {
      if (!existing.id.startsWith(SNOOZE_PREFIX) && existing.id != TEST_ID) {
        cancel(context, existing.id)
      }
    }
    for (alarm in alarms) {
      schedule(context, alarm)
    }
  }

  // Everything, snoozes included: on sign-out, or when ringing is turned off
  fun cancelAll(context: Context) {
    for (existing in AlarmStore.all(context)) {
      cancel(context, existing.id)
    }
  }

  // After a restart or an app update: schedule again whatever is still to come
  fun restoreAll(context: Context) {
    val now = System.currentTimeMillis()
    for (alarm in AlarmStore.all(context)) {
      if (alarm.at > now) {
        setExact(context, alarm.at, fireIntent(context, alarm.id))
      } else {
        AlarmStore.remove(context, alarm.id)
      }
    }
  }

  fun setExact(context: Context, at: Long, operation: PendingIntent) {
    val manager = alarmManager(context)
    // Caltal declares USE_EXACT_ALARM, so this is normally allowed. If a phone
    // says no anyway, an inexact alarm still rings, just possibly a bit late.
    val exactAllowed =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
    try {
      if (exactAllowed) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      } else {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      }
    } catch (error: SecurityException) {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
    }
  }

  fun cancelOperation(context: Context, operation: PendingIntent) {
    alarmManager(context).cancel(operation)
  }

  private fun alarmManager(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun fireIntent(context: Context, id: String): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      // The address is part of what makes two PendingIntents different, so
      // each reminder gets its own instead of replacing the last one
      .setData(Uri.parse("caltal-alarm://fire/" + Uri.encode(id)))
      .putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}

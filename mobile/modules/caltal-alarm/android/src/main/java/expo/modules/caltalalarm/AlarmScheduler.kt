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

  // Without the "Alarms & reminders" permission, Android may hold an inexact
  // alarm back by up to an hour. Asking for a 10-minute window keeps it close
  // while the phone is in use; Android won't make a window any shorter.
  private const val WINDOW_MS = 10 * 60_000L

  fun schedule(context: Context, alarm: Alarm) {
    AlarmStore.put(context, alarm)
    setReminder(context, alarm.at, alarm.id)
  }

  fun cancel(context: Context, id: String) {
    val manager = alarmManager(context)
    manager.cancel(fireIntent(context, id))
    manager.cancel(fireIntent(context, id, backup = true))
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
        setReminder(context, alarm.at, alarm.id)
      } else {
        AlarmStore.remove(context, alarm.id)
      }
    }
  }

  // Whether alarms may go off at the exact minute. Android 12 and later let
  // the person turn this off ("Alarms & reminders" in the phone's settings),
  // and from Android 14 it starts off for new installs until they allow it.
  fun canScheduleExact(context: Context) =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(context).canScheduleExactAlarms()

  fun setExact(context: Context, at: Long, operation: PendingIntent) {
    val manager = alarmManager(context)
    // Caltal asks for SCHEDULE_EXACT_ALARM, which the person allows from
    // Settings in the app. Until they do, an inexact alarm still rings, just
    // possibly a few minutes late. When they allow it, BootReceiver sets every
    // alarm again, exactly.
    try {
      if (canScheduleExact(context)) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      } else {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      }
    } catch (error: SecurityException) {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
    }
  }

  // A reminder coming due. With exact alarms allowed, one alarm at the exact
  // minute. Without, two inexact ones: a 10-minute window, which keeps close
  // to the time while the phone is in use but waits while it's idle, and an
  // allow-while-idle backup, which still comes when the phone is idle. The
  // first to fire rings; the other then finds nothing to ring (AlarmReceiver).
  fun setReminder(context: Context, at: Long, id: String) {
    val manager = alarmManager(context)
    val main = fireIntent(context, id)
    val backup = fireIntent(context, id, backup = true)

    if (canScheduleExact(context)) {
      try {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, main)
        manager.cancel(backup)
        return
      } catch (error: SecurityException) {
        // Switched off a moment ago: fall through to the inexact pair
      }
    }

    manager.setWindow(AlarmManager.RTC_WAKEUP, at, WINDOW_MS, main)
    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, backup)
  }

  fun cancelOperation(context: Context, operation: PendingIntent) {
    alarmManager(context).cancel(operation)
  }

  private fun alarmManager(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun fireIntent(context: Context, id: String, backup: Boolean = false): PendingIntent {
    val kind = if (backup) "fire-backup" else "fire"
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      // The address is part of what makes two PendingIntents different, so
      // each reminder (and its backup) gets its own instead of replacing the
      // last one
      .setData(Uri.parse("caltal-alarm://" + kind + "/" + Uri.encode(id)))
      .putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}

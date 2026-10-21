package expo.modules.caltalalarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// A reminder as JavaScript sends it (see modules/caltal-alarm/index.js)
class AlarmRecord(
  @Field val id: String = "",
  @Field val at: Double = 0.0,
  @Field val title: String = "",
  @Field val body: String = "",
  @Field val taskId: Int? = null,
  @Field val hasVoiceNote: Boolean = false
) : Record {
  fun toAlarm() = Alarm(id, at.toLong(), title, body, taskId, hasVoiceNote)
}

// What Caltal's JavaScript can ask for. Android only: on iPhone the module
// doesn't exist, and the app uses ordinary notifications.
class CaltalAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CaltalAlarm")

    // Swaps the scheduled ringing reminders for these. Snoozed ones stay.
    AsyncFunction("replaceScheduled") { alarms: List<AlarmRecord> ->
      AlarmScheduler.replaceScheduled(context, alarms.map { it.toAlarm() })
    }

    // Adds one without touching the rest (the Settings test)
    AsyncFunction("schedule") { alarm: AlarmRecord ->
      AlarmScheduler.schedule(context, alarm.toAlarm())
    }

    AsyncFunction("cancelAll") {
      AlarmScheduler.cancelAll(context)
    }

    // Rings straight away: for place reminders, which come from the phone
    // noticing you've arrived rather than from a clock
    AsyncFunction("ringNow") { alarm: AlarmRecord ->
      Ringer.ring(context, alarm.toAlarm())
    }

    Function("canRingFullScreen") {
      Ringer.canRingFullScreen(context)
    }

    // The "Full screen notifications" switch for Caltal (Android 14+)
    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val intent = Intent(
          Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
          Uri.parse("package:" + context.packageName)
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    // Whether reminders, ringing or not, can go off at the exact minute
    Function("canScheduleExact") {
      AlarmScheduler.canScheduleExact(context)
    }

    // The "Alarms & reminders" switch for Caltal (Android 12+)
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:" + context.packageName)
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }
  }
}

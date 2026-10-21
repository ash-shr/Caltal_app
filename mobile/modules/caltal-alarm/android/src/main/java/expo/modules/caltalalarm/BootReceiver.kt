package expo.modules.caltalalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Android forgets scheduled alarms when the phone restarts. This puts back the
// ones still to come (and after an app update, to be safe).
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED ->
        AlarmScheduler.restoreAll(context)
    }
  }
}

package expo.modules.caltalalarm

import org.json.JSONObject

// One ringing reminder: what it says, which task it's about, and when it rings.
// Kept as JSON on the phone (AlarmStore) and carried inside intents, because a
// reminder can ring with Caltal's JavaScript not running at all.
data class Alarm(
  val id: String,
  // When to ring, in milliseconds since 1970 (what JavaScript's Date uses)
  val at: Long,
  val title: String,
  val body: String,
  val taskId: Int?,
  val hasVoiceNote: Boolean
) {
  fun toJson(): String {
    val json = JSONObject()
    json.put("id", id)
    json.put("at", at)
    json.put("title", title)
    json.put("body", body)
    if (taskId != null) {
      json.put("taskId", taskId)
    }
    json.put("hasVoiceNote", hasVoiceNote)
    return json.toString()
  }

  companion object {
    fun fromJson(text: String?): Alarm? {
      if (text == null) {
        return null
      }
      return try {
        val json = JSONObject(text)
        Alarm(
          id = json.getString("id"),
          at = json.getLong("at"),
          title = json.optString("title", "Caltal"),
          body = json.optString("body", ""),
          taskId = if (json.has("taskId")) json.getInt("taskId") else null,
          hasVoiceNote = json.optBoolean("hasVoiceNote", false)
        )
      } catch (error: Exception) {
        null
      }
    }
  }
}

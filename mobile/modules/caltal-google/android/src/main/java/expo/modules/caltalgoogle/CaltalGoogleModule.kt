package expo.modules.caltalgoogle

import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// "Continue with Google" on Android. Android's Credential Manager shows
// Google's own account picker; the account chosen comes back as an ID token,
// signed by Google, which Caltal's server checks before signing the person in
// (the same check as for the website's Google button).
//
// The answer is always an object with a status, never a thrown error, so the
// JavaScript side can tell "closed the picker" from a real problem.
class CaltalGoogleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CaltalGoogle")

    // webClientId: the "Web application" OAuth client from Google Cloud. The
    // token Google gives back is made out to it, which is what the server
    // checks for. (The app's own "Android" client is matched to the app by
    // its package name and signing certificate, behind the scenes.)
    AsyncFunction("signIn") Coroutine { webClientId: String ->
      val activity = appContext.currentActivity
        ?: return@Coroutine result("error", "message" to "Caltal isn't on screen")

      // The "Sign in with Google" version of the picker: it lists every
      // Google account on the phone, and lets the person add one
      val option = GetSignInWithGoogleOption.Builder(webClientId).build()
      val request = GetCredentialRequest.Builder()
        .addCredentialOption(option)
        .build()

      try {
        val credential = CredentialManager.create(activity)
          .getCredential(activity, request)
          .credential

        if (credential is CustomCredential &&
          credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
          val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
          result("ok", "idToken" to idToken)
        } else {
          result("error", "message" to "Google didn't send back an account")
        }
      } catch (cancelled: GetCredentialCancellationException) {
        result("cancelled")
      } catch (none: NoCredentialException) {
        result("no-account")
      } catch (failure: GetCredentialException) {
        result("error", "message" to (failure.message ?: failure.type))
      } catch (failure: GoogleIdTokenParsingException) {
        result("error", "message" to (failure.message ?: "Google's answer couldn't be read"))
      }
    }
  }

  private fun result(status: String, vararg extra: Pair<String, String>): Map<String, String> =
    mapOf("status" to status) + extra
}

import CaltalGoogle from '../modules/caltal-google';
import { GOOGLE_WEB_CLIENT_ID } from './config';

// "Continue with Google": Android only for now (Caltal's own module,
// modules/caltal-google), and only once the Google client ID is set.
export const googleSignInAvailable = CaltalGoogle != null && GOOGLE_WEB_CLIENT_ID !== '';

// Shows Google's account picker. Resolves with the ID token of the account
// chosen, or null if the picker was closed. Throws with a message to show for
// anything else.
export async function chooseGoogleAccount() {
  const result = await CaltalGoogle.signIn(GOOGLE_WEB_CLIENT_ID);

  switch (result.status) {
    case 'ok':
      return result.idToken;
    case 'cancelled':
      return null;
    case 'no-account':
      throw new Error(
        "There's no Google account on this phone. Add one in the phone's Settings, or use your email instead.",
      );
    default:
      throw new Error(`Couldn't sign in with Google. ${result.message ?? 'Please try again.'}`);
  }
}

import { requireOptionalNativeModule } from 'expo';

// Caltal's own Android code for "Continue with Google"
// (android/src/main/java/expo/modules/caltalgoogle). null on iPhone, where the
// module doesn't exist yet, so the button isn't shown there.
//
//   signIn(webClientId)  shows Google's account picker and resolves with one of
//     { status: 'ok', idToken }   the account chosen; send idToken to the server
//     { status: 'cancelled' }     closed without choosing
//     { status: 'no-account' }    no Google account on the phone
//     { status: 'error', message }
export default requireOptionalNativeModule('CaltalGoogle');

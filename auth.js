import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  setPersistence,
  signOut,
  signInWithPopup,
  signInWithRedirect,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const authScreen = document.getElementById("auth-screen");
const siteShell = document.getElementById("site-shell");
const statusElement = document.getElementById("auth-status");
const emailAuthForm = document.getElementById("email-auth-form");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const createAccountButton = document.getElementById("create-account-button");
const emailLoginButton = document.getElementById("email-login-button");
const googleLoginButton = document.getElementById("google-login-button");
const userPhoto = document.getElementById("user-photo");
const userName = document.getElementById("user-name");
const userPhotoUpload = document.getElementById("user-photo-upload");
const logoutLink = document.getElementById("logout-link");

function getPhotoStorageKey(user) {
  return user?.uid ? `customPfp:${user.uid}` : null;
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("auth-status-error", isError);
}

function updateProfile(user) {
  if (!user) {
    return;
  }

  userName.textContent = user.displayName || user.email || "User";
  const customPhoto = getPhotoStorageKey(user) ? localStorage.getItem(getPhotoStorageKey(user)) : null;
  if (customPhoto) {
    userPhoto.src = customPhoto;
  } else {
    userPhoto.src = "default.webp";
  }
}

function showSite() {
  document.body.classList.remove("auth-pending");
  document.body.classList.add("authenticated");
  authScreen.setAttribute("hidden", "hidden");
  authScreen.style.display = "none";
  siteShell.removeAttribute("aria-hidden");
  siteShell.style.display = "block";
  siteShell.style.visibility = "visible";
  if (typeof window.vanish === "function") {
    window.vanish();
  }
  if (typeof window.handleAuthenticatedRedirect === "function") {
    window.handleAuthenticatedRedirect();
  }
}

function showAuthGate() {
  document.body.classList.add("auth-pending");
  document.body.classList.remove("authenticated");
  authScreen.removeAttribute("hidden");
  authScreen.style.display = "flex";
  siteShell.setAttribute("aria-hidden", "true");
  siteShell.style.display = "none";
  siteShell.style.visibility = "hidden";
}

function hasPlaceholderConfig(config) {
  return Object.values(config).some((value) => typeof value === "string" && value.startsWith("PASTE_YOUR_"));
}

function getTrimmedEmail() {
  return emailInput.value.trim().toLowerCase();
}

function isGmailAddress(value) {
  return /^[a-z0-9._%+-]+@gmail\.com$/i.test(value);
}

function getFriendlyAuthError(error, action) {
  switch (error?.code) {
    case "auth/email-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "This Gmail is already used.";
    case "auth/wrong-password":
      return "Wrong password.";
    case "auth/user-not-found":
      return "Please click Create account to create an account.";
    case "auth/invalid-email":
      return "Enter a valid Gmail address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "auth/popup-blocked":
      return "Popup blocked. Allow popups and try again.";
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    default:
      return action;
  }
}

function setAuthControlsDisabled(isDisabled) {
  emailInput.disabled = isDisabled;
  passwordInput.disabled = isDisabled;
  createAccountButton.disabled = isDisabled;
  emailLoginButton.disabled = isDisabled;
  googleLoginButton.disabled = isDisabled;
}

const firebaseConfig = window.firebaseConfig;

if (!firebaseConfig || hasPlaceholderConfig(firebaseConfig)) {
  setAuthControlsDisabled(true);
  setStatus(
    "Add your Firebase project values in firebase-config.js, then enable Google and Email/Password sign-in in Firebase Authentication.",
    true
  );
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  setPersistence(auth, browserLocalPersistence).catch(() => {
    setStatus("Could not save login persistence in this browser.", true);
  });

  emailAuthForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = getTrimmedEmail();
    if (!isGmailAddress(email)) {
      setStatus("Use a valid Gmail address ending with @gmail.com.", true);
      return;
    }

    setAuthControlsDisabled(true);
    setStatus("Creating account...");

    try {
      await createUserWithEmailAndPassword(auth, email, passwordInput.value);
    } catch (error) {
      setStatus(getFriendlyAuthError(error, "Could not create account."), true);
      setAuthControlsDisabled(false);
    }
  });

  emailLoginButton.addEventListener("click", async () => {
    if (!emailAuthForm.reportValidity()) {
      return;
    }

    const email = getTrimmedEmail();
    if (!isGmailAddress(email)) {
      setStatus("Use a valid Gmail address ending with @gmail.com.", true);
      return;
    }

    setAuthControlsDisabled(true);
    setStatus("Signing in with Gmail...");

    try {
      await signInWithEmailAndPassword(auth, email, passwordInput.value);
    } catch (error) {
      const message =
        error?.code === "auth/invalid-credential"
          ? "Please click Create account to create an account."
          : getFriendlyAuthError(error, "Email sign-in failed.");
      setStatus(message, true);
      setAuthControlsDisabled(false);
    }
  });

  googleLoginButton.addEventListener("click", async () => {
    setAuthControlsDisabled(true);
    setStatus("Opening Google sign-in...");

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
        setStatus("Popup blocked. Redirecting to Google sign-in...");
        await signInWithRedirect(auth, provider);
        return;
      }

      setAuthControlsDisabled(false);
      setStatus(getFriendlyAuthError(error, "Google sign-in failed."), true);
    }
  });

  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await signOut(auth);
      showAuthGate();
      setStatus("Signed out. Create an account, sign in with Gmail, or continue with Google.");
    } catch (error) {
      setStatus(getFriendlyAuthError(error, "Sign out failed."), true);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      updateProfile(user);
      setStatus(`Signed in as ${user.displayName || user.email || "user"}.`);
      showSite();
      return;
    }

    showAuthGate();
    setAuthControlsDisabled(false);
    setStatus("Create an account, sign in with Gmail, or continue with Google.");
  });

  userPhotoUpload.addEventListener("change", () => {
    const [file] = userPhotoUpload.files || [];
    const currentUser = auth.currentUser;
    const storageKey = getPhotoStorageKey(currentUser);

    if (!file || !currentUser || !storageKey) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }

      localStorage.setItem(storageKey, result);
      userPhoto.src = result;
    };
    reader.readAsDataURL(file);
  });
}

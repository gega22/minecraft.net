import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const authScreen = document.getElementById("auth-screen");
const siteShell = document.getElementById("site-shell");
const statusElement = document.getElementById("auth-status");
const googleLoginButton = document.getElementById("google-login-button");
const userPhoto = document.getElementById("user-photo");
const userName = document.getElementById("user-name");
const userPhotoUpload = document.getElementById("user-photo-upload");

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

  userName.textContent = user.displayName || user.email || "Google User";
  const customPhoto = getPhotoStorageKey(user) ? localStorage.getItem(getPhotoStorageKey(user)) : null;
  if (customPhoto) {
    userPhoto.src = customPhoto;
  } else if (user.photoURL) {
    userPhoto.src = user.photoURL;
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

function hasPlaceholderConfig(config) {
  return Object.values(config).some((value) => typeof value === "string" && value.startsWith("PASTE_YOUR_"));
}

const firebaseConfig = window.firebaseConfig;

if (!firebaseConfig || hasPlaceholderConfig(firebaseConfig)) {
  googleLoginButton.disabled = true;
  setStatus(
    "Add your Firebase project values in firebase-config.js, then enable Google sign-in in Firebase Authentication.",
    true
  );
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  setPersistence(auth, browserLocalPersistence).catch(() => {
    setStatus("Could not save login persistence in this browser.", true);
  });

  googleLoginButton.addEventListener("click", async () => {
    googleLoginButton.disabled = true;
    setStatus("Opening Google sign-in...");

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
        setStatus("Popup blocked. Redirecting to Google sign-in...");
        await signInWithRedirect(auth, provider);
        return;
      }

      googleLoginButton.disabled = false;
      setStatus(error?.message || "Google sign-in failed.", true);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      updateProfile(user);
      setStatus(`Signed in as ${user.displayName || user.email || "Google user"}.`);
      showSite();
      return;
    }

    googleLoginButton.disabled = false;
    setStatus("Sign in with Google to unlock the site.");
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

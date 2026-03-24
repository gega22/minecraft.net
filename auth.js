import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  setPersistence,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const authScreen = document.getElementById("auth-screen");
const siteShell = document.getElementById("site-shell");
const statusElement = document.getElementById("auth-status");
const emailAuthForm = document.getElementById("email-auth-form");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const createAccountButton = document.getElementById("create-account-button");
const emailLoginButton = document.getElementById("email-login-button");
const userPhoto = document.getElementById("user-photo");
const userName = document.getElementById("user-name");
const userPhotoUpload = document.getElementById("user-photo-upload");
const logoutLink = document.getElementById("logout-link");

function getUserProfileRef(db, user) {
  return user?.uid ? doc(db, "users", user.uid) : null;
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("auth-status-error", isError);
}

function updateProfile(user, profileData = null) {
  if (!user) {
    return;
  }

  userName.textContent = user.displayName || user.email || "User";
  const syncedPhoto = profileData?.customPhoto || null;
  const accountPhoto = syncedPhoto || user.photoURL || "default.webp";
  userPhoto.src = accountPhoto;
}

async function loadUserProfile(db, user) {
  const profileRef = getUserProfileRef(db, user);
  if (!profileRef) {
    return null;
  }

  const profileSnapshot = await getDoc(profileRef);
  return profileSnapshot.exists() ? profileSnapshot.data() : null;
}

function resizeImageFile(file, maxSize = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      if (!source) {
        reject(new Error("Could not read the selected file."));
        return;
      }

      const image = new Image();
      image.onerror = () => reject(new Error("Selected file is not a supported image."));
      image.onload = () => {
        const longestSide = Math.max(image.width, image.height) || 1;
        const scale = Math.min(1, maxSize / longestSide);
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not process the selected image."));
          return;
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = source;
    };

    reader.readAsDataURL(file);
  });
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
    default:
      return action;
  }
}

function setAuthControlsDisabled(isDisabled) {
  emailInput.disabled = isDisabled;
  passwordInput.disabled = isDisabled;
  createAccountButton.disabled = isDisabled;
  emailLoginButton.disabled = isDisabled;
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
  const db = getFirestore(app);

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

  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await signOut(auth);
      showAuthGate();
      setStatus("Signed out. Create an account or sign in with Gmail.");
    } catch (error) {
      setStatus(getFriendlyAuthError(error, "Sign out failed."), true);
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profileData = await loadUserProfile(db, user);
        updateProfile(user, profileData);
      } catch (error) {
        updateProfile(user);
        setStatus("Signed in, but synced profile data could not be loaded.", true);
        showSite();
        return;
      }

      setStatus(`Signed in as ${user.displayName || user.email || "user"}.`);
      showSite();
      return;
    }

    showAuthGate();
    setAuthControlsDisabled(false);
    setStatus("Create an account or sign in with Gmail.");
  });

  userPhotoUpload.addEventListener("change", async () => {
    const [file] = userPhotoUpload.files || [];
    const currentUser = auth.currentUser;
    const profileRef = getUserProfileRef(db, currentUser);

    if (!file || !currentUser || !profileRef) {
      return;
    }

    setStatus("Saving profile picture...");

    try {
      const result = await resizeImageFile(file);
      userPhoto.src = result;
      await setDoc(
        profileRef,
        {
          customPhoto: result,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setStatus("Profile picture saved and synced to your account.");
    } catch (error) {
      setStatus("Could not save profile picture.", true);
    } finally {
      userPhotoUpload.value = "";
    }
  });
}

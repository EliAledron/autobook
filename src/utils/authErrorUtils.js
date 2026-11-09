/**
 * Translates Firebase Auth and system error codes into clear, user-friendly messages.
 * Prevents raw technical exceptions (e.g. "Firebase: Error (auth/invalid-credential).")
 * from being shown to users.
 *
 * @param {Error|string} err - The error object or error message string.
 * @param {"general"|"signup"|"login"|"reset"} context - The context in which the error occurred.
 * @returns {string} Human-friendly error message.
 */
export function getFriendlyErrorMessage(err, context = "general") {
  if (!err) return "";

  const code = (typeof err === "object" && err?.code ? err.code : "").toLowerCase();
  const rawMsg = (typeof err === "string" ? err : err?.message || "").toLowerCase();

  // 1. Invalid credential / password mismatch
  if (
    code === "auth/invalid-credential" ||
    rawMsg.includes("auth/invalid-credential") ||
    rawMsg.includes("invalid-credential")
  ) {
    if (context === "signup") {
      return "This email is already registered. If you already have an account, please log in with your password, or use a different email to sign up.";
    }
    return "Incorrect email or password. Please check your details and try again.";
  }

  // 2. Email already in use
  if (
    code === "auth/email-already-in-use" ||
    rawMsg.includes("auth/email-already-in-use") ||
    rawMsg.includes("email-already-in-use") ||
    rawMsg.includes("already registered") ||
    rawMsg.includes("email already in use")
  ) {
    return "This email is already registered. Please log in to your account, or use a different email address.";
  }

  // 3. User not found
  if (
    code === "auth/user-not-found" ||
    rawMsg.includes("auth/user-not-found") ||
    rawMsg.includes("user-not-found")
  ) {
    if (context === "reset") {
      return "No account found with this email. Please check your email or sign up.";
    }
    return "No account found with this email. Please check your spelling or create a new account.";
  }

  // 4. Wrong password
  if (
    code === "auth/wrong-password" ||
    rawMsg.includes("auth/wrong-password") ||
    rawMsg.includes("wrong-password")
  ) {
    return "Incorrect password. Please try again or click 'Forgot Password' to reset it.";
  }

  // 5. Invalid email format
  if (
    code === "auth/invalid-email" ||
    rawMsg.includes("auth/invalid-email") ||
    rawMsg.includes("invalid-email")
  ) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }

  // 6. Weak password
  if (
    code === "auth/weak-password" ||
    rawMsg.includes("auth/weak-password") ||
    rawMsg.includes("weak-password")
  ) {
    return "Password is too weak. Please use at least 6 characters with a combination of letters and numbers.";
  }

  // 7. Missing password
  if (
    code === "auth/missing-password" ||
    rawMsg.includes("auth/missing-password") ||
    rawMsg.includes("missing-password")
  ) {
    return "Please enter your password.";
  }

  // 8. Too many failed attempts (rate limited)
  if (
    code === "auth/too-many-requests" ||
    rawMsg.includes("auth/too-many-requests") ||
    rawMsg.includes("too-many-requests")
  ) {
    return "Too many unsuccessful attempts. For security, your access is temporarily paused. Please reset your password or try again in a few minutes.";
  }

  // 9. Account disabled
  if (
    code === "auth/user-disabled" ||
    rawMsg.includes("auth/user-disabled") ||
    rawMsg.includes("user-disabled")
  ) {
    return "This account has been disabled. Please contact AutoBook support for assistance.";
  }

  // 10. Network failure
  if (
    code === "auth/network-request-failed" ||
    rawMsg.includes("auth/network-request-failed") ||
    rawMsg.includes("network-request-failed") ||
    rawMsg.includes("failed to fetch")
  ) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  // 11. Browser popup issues
  if (
    code === "auth/popup-closed-by-user" ||
    rawMsg.includes("auth/popup-closed-by-user")
  ) {
    return ""; // User intentionally closed popup — no error needed
  }

  if (
    code === "auth/popup-blocked" ||
    rawMsg.includes("auth/popup-blocked")
  ) {
    return "The sign-in popup was blocked by your browser. Please allow popups for this site and try again.";
  }

  // 12. Unauthorized domain (Firebase Auth configuration)
  if (
    code === "auth/unauthorized-domain" ||
    rawMsg.includes("auth/unauthorized-domain")
  ) {
    return "This domain is not authorized for authentication. Please contact support.";
  }

  // 13. File / Upload issues
  if (
    rawMsg.includes("upload failed") ||
    rawMsg.includes("cloudinary") ||
    rawMsg.includes("failed to upload")
  ) {
    return "Failed to upload document or image. Please check your file format and internet connection, then try again.";
  }

  // 14. Fallback cleanup: strip any "Firebase: Error (auth/...)." formatting
  const originalStr = typeof err === "string" ? err : err?.message || "";
  if (originalStr) {
    const cleaned = originalStr
      .replace(/^Firebase:\s*(Error\s*)?/i, "")
      .replace(/\s*\(auth\/[^)]+\)\.?/gi, "")
      .trim();

    if (cleaned && cleaned.length > 2) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  return "An unexpected error occurred. Please try again.";
}

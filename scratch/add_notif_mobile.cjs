const fs = require('fs');

let file = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');

const notifCode = `
      await updateDoc(doc(db, "users", id), updates);

      // Create In-App Notification
      if (status === "approved" || status === "rejected") {
        await addDoc(collection(db, "notifications"), {
          userId: id,
          title: status === "approved" ? "Account Approved 🎉" : "Application Update",
          message: status === "approved" ? "Your account has been fully approved. Welcome to AutoBook!" : "Your application was not approved. Admin Note: " + (inputValue || "Please check your details."),
          read: false,
          createdAt: serverTimestamp(),
          type: "system"
        });
      }
`;

if (!file.includes('collection(db, "notifications")')) {
  file = file.replace('await updateDoc(doc(db, "users", id), updates);', notifCode);
  fs.writeFileSync('src/screens/AdminUsers.jsx', file);
  console.log("Updated AdminUsers with notifications");
} else {
  console.log("AdminUsers already has notifications");
}

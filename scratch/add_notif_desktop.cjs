const fs = require('fs');

let file = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

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
  // We need serverTimestamp and addDoc in imports
  if (!file.includes('serverTimestamp')) {
    file = file.replace(
      'import { collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";',
      'import { collection, onSnapshot, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";'
    );
  }
  
  file = file.replace('await updateDoc(doc(db, "users", id), updates);', notifCode);
  fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', file);
  console.log("Updated DesktopAdminUsers with notifications");
} else {
  console.log("Desktop already has notifications");
}

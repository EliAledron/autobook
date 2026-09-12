const fs = require('fs');

// 1. DesktopAdminUsers.jsx
let desktop = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

const desktopRegex = /const handleStatusUpdate = async \(id, status\) => {/g;
desktop = desktop.replace(desktopRegex, `const handleStatusUpdate = async (id, status) => {
    let msg = "";
    if (status === "approved") msg = "Are you sure you want to approve this user?";
    else if (status === "rejected") msg = "Are you sure you want to reject this user?";
    else if (status === "restricted") msg = "Are you sure you want to restrict this user?";
    if (msg && !window.confirm(msg)) return;
`);

fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', desktop);

// 2. AdminUsers.jsx
let mobile = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');

const mobileRegex = /const updateStatus = async \(id, status\) => {/g;
mobile = mobile.replace(mobileRegex, `const updateStatus = async (id, status) => {
    let msg = "";
    if (status === "approved") msg = "Are you sure you want to approve this user?";
    else if (status === "rejected") msg = "Are you sure you want to reject this user?";
    // restrict already has a confirm in the UI, but we can add it here and remove the UI one later if needed.
    // To be safe, only check approve/reject here if restrict isn't checked
    if (msg && !window.confirm(msg)) return;
`);

fs.writeFileSync('src/screens/AdminUsers.jsx', mobile);

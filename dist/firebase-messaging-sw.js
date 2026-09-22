importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCXbnWimCn7nPWhXLyPThnUmTNZafbBbr0",
  authDomain: "autobook-82c52.firebaseapp.com",
  projectId: "autobook-82c52",
  storageBucket: "autobook-82c52.appspot.com",
  messagingSenderId: "638148263658",
  appId: "1:638148263658:web:d757f10bac4ddc30fd2193",
  measurementId: "G-9GGDJWXX4D"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.svg',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

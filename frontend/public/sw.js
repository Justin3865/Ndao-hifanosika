/* Service worker — notifications système (toast en bas à droite de Windows, centre de notifications macOS/Android).
   À placer dans le dossier public/ du frontend (accessible sur /sw.js). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Réception d'un Web Push envoyé par le serveur (fonctionne même application fermée)
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Ndao Hifanosika", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Ndao Hifanosika";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined, // même tag = pas de doublon avec l'affichage local
      icon: "/apple-touch-icon.png",
      badge: "/apple-touch-icon.png",
      requireInteraction: false,
      data: { url: data.url || "/notifications" },
    }),
  );
});

// Clic sur la notification : ouvre / met au premier plan l'application sur la bonne page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL((event.notification.data && event.notification.data.url) || "/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then((focused) => ("navigate" in focused ? focused.navigate(target) : focused));
        }
      }

      return self.clients.openWindow(target);
    }),
  );
});

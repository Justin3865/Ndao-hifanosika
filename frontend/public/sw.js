/* Service worker : notifications système (barre des tâches du PC / notifications du téléphone). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Notification poussée par le serveur (Web Push), application ouverte ou non
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: "Nouveau message", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      // Application au premier plan : la bannière interne suffit
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.focused)) return;

      await self.registration.showNotification(data.title || "Ndao Hifanosika", {
        body: data.body || "",
        tag: data.tag || undefined,
        icon: "/apple-touch-icon.png",
        data: { url: data.url || "/notifications" },
      });
    })(),
  );
});

// Clic sur la notification : ouvre / ramène l'application sur le bon message
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL((event.notification.data && event.notification.data.url) || "/notifications", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});

import { supabase } from "@/integrations/supabase/client";

export type AppEventName =
  | "scan_hub_opened"
  | "scan_option_selected"
  | "wine_menu_scan_started"
  | "wine_menu_scan_completed"
  | "wine_menu_scan_failed"
  | "wine_label_scan_started"
  | "wine_label_scan_completed"
  | "wine_label_scan_failed"
  | "multi_wine_label_scan_started"
  | "multi_wine_label_scan_completed"
  | "multi_wine_label_scan_failed"
  | "wine_menu_scan_quality_rejected"
  | "food_scan_started"
  | "food_scan_completed"
  | "food_scan_failed"
  | "wine_saved"
  | "wine_rating_added"
  | "profile_learning_updated"
  | "airim_opened"
  | "airim_question_started"
  | "airim_question_completed"
  | "airim_question_failed"
  | "winerim_wines_loaded"
  | "winerim_wines_failed"
  | "shop_link_analyzed";

const APP_VERSION = "matchrim-2026-06-22";

const detectPlatform = (): string => {
  if (typeof window === "undefined") return "ssr";
  const ua = window.navigator.userAgent || "";
  if (/Capacitor/i.test(ua)) return "native";
  if (/Android/i.test(ua)) return "android-web";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios-web";
  return "web";
};

export const trackAppEvent = (
  eventName: AppEventName,
  metadata: Record<string, unknown> = {}
): void => {
  // fire-and-forget; never block UX
  try {
    const route = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : null;

    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id ?? null;
        await supabase.from("app_events").insert({
          user_id: userId,
          event_name: eventName,
          route,
          platform: detectPlatform(),
          app_version: APP_VERSION,
          metadata: metadata as never,
        });
      } catch (err) {
        // silent fail
        if (typeof console !== "undefined") {
          console.debug("[analytics] failed", eventName, err);
        }
      }
    })();
  } catch {
    // never throw
  }
};

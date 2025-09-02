"use client";

import Intercom from "@intercom/messenger-js-sdk";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuthContext } from "../AuthContext";

export function Client(props: { hash?: string }) {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const isSharePage = pathname?.startsWith("/s/");

  useEffect(() => {
    if (isSharePage) return;
    
    if (props.hash && user) {
      Intercom({
        app_id: "efxq71cv",
        user_id: user.uid, // Using uid instead of id for Firebase Auth
        user_hash: props.hash,
        name: user.displayName ?? "",
        email: user.email ?? "",
        utm_source: "web",
      });
    } else {
      Intercom({
        app_id: "efxq71cv",
        utm_source: "web",
      });
    }

    // Cleanup Intercom on unmount
    return () => {
      Intercom('shutdown' as any);
    };
  }, [props.hash, user, isSharePage]);

  return null;
}

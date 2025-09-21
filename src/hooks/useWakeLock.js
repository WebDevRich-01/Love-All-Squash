import { useEffect, useRef, useState } from "react";

/**
 * Custom hook to manage Screen Wake Lock API
 * Prevents the screen from turning off during matches
 */
export const useWakeLock = () => {
  const wakeLockRef = useRef(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Check if Wake Lock API is supported
    setIsSupported("wakeLock" in navigator);
  }, []);

  const requestWakeLock = async () => {
    if (!isSupported) {
      console.log("Wake Lock API not supported");
      return false;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);

      console.log("Screen Wake Lock activated");

      // Listen for wake lock release
      wakeLockRef.current.addEventListener("release", () => {
        console.log("Screen Wake Lock released");
        setIsActive(false);
      });

      return true;
    } catch (err) {
      console.error(`Failed to request wake lock: ${err.name}, ${err.message}`);
      setIsActive(false);
      return false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log("Screen Wake Lock manually released");
      } catch (err) {
        console.error(
          `Failed to release wake lock: ${err.name}, ${err.message}`
        );
      }
    }
  };

  // Auto-reacquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isActive &&
        !wakeLockRef.current
      ) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isActive]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
};

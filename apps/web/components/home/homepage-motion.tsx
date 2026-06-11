"use client";

import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

gsap.registerPlugin(ScrollTrigger, useGSAP);

type MatchMediaConditions = {
  isDesktop?: boolean;
  reduceMotion?: boolean;
};

export function HomepageMotion({ children }: PropsWithChildren) {
  const rootRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root || typeof window === "undefined" || !window.matchMedia) {
        return;
      }

      const select = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 1024px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } =
            (context.conditions ?? {}) as MatchMediaConditions;
          const motionItems = select(".homepage-motion-item");

          if (reduceMotion) {
            gsap.set(motionItems, { autoAlpha: 1, clearProps: "all" });
            return;
          }

          const intro = gsap.timeline({
            defaults: { duration: 0.5, ease: "power3.out" },
          });

          intro
            .from(select(".homepage-nav"), {
              y: -10,
              autoAlpha: 0,
              duration: 0.28,
            })
            .from(
              select(".homepage-hero-copy > *"),
              {
                y: 16,
                autoAlpha: 0,
                stagger: 0.045,
              },
              "-=0.08",
            )
            .from(
              select(".homepage-hero-preview"),
              {
                y: 28,
                scale: 0.98,
                autoAlpha: 0,
                duration: 0.58,
              },
              "-=0.44",
            )
            .from(
              select(".homepage-preview-row, .homepage-preview-command"),
              {
                y: 10,
                autoAlpha: 0,
                stagger: 0.045,
                duration: 0.32,
              },
              "-=0.24",
            )
            .from(
              select(".homepage-preview-scene"),
              {
                y: 12,
                autoAlpha: 0,
                duration: 0.34,
              },
              "-=0.16",
            );

          const scrollItems = motionItems.filter(
            (item) => !item.closest(".homepage-hero"),
          );

          gsap.set(scrollItems, { autoAlpha: 0, y: 18, scale: 0.988 });

          ScrollTrigger.batch(scrollItems, {
            start: "top 84%",
            once: true,
            interval: 0.08,
            batchMax: isDesktop ? 4 : 2,
            onEnter: (batch) => {
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.68,
                ease: "power3.out",
                stagger: { each: 0.075, from: "start" },
                overwrite: "auto",
                clearProps: "transform,visibility",
              });
            },
          });

          gsap.to(select(".homepage-preview-shell"), {
            y: isDesktop ? 24 : 10,
            rotationX: isDesktop ? -2.5 : 0,
            ease: "none",
            scrollTrigger: {
              trigger: select(".homepage-hero")[0],
              start: "top top",
              end: "bottom top",
              scrub: 0.8,
            },
          });

          gsap.to(select(".homepage-preview-scene"), {
            y: -4,
            duration: 2.4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });

          gsap.to(select(".homepage-ai-spark"), {
            scale: 1.1,
            rotation: 8,
            transformOrigin: "50% 50%",
            duration: 1.8,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <main
      ref={rootRef}
      className="homepage-motion-root workspace-shell min-h-screen overflow-hidden text-foreground"
    >
      {children}
    </main>
  );
}

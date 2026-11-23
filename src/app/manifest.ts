import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Кабинет ученика KIBERone Караганда",
    short_name: "KIBERone",
    description: "Личный кабинет ученика школы программирования KIBERone Караганда",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f8fc",
    theme_color: "#17315c",
    lang: "ru",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

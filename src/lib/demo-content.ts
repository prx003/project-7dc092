import market from "@/assets/demo-market.jpg";
import chai from "@/assets/demo-chai.jpg";
import rooftop from "@/assets/demo-rooftop.jpg";

export const demoAccounts = [
  { id: "demo-asha", username: "asha.demo", display_name: "Asha · Demo", avatar_url: market },
  { id: "demo-chai", username: "chai.demo", display_name: "Chai Corner · Demo", avatar_url: chai },
  { id: "demo-arjun", username: "arjun.demo", display_name: "Arjun · Demo", avatar_url: rooftop },
  { id: "demo-city", username: "city.demo", display_name: "City Stories · Demo", avatar_url: market },
  { id: "demo-food", username: "food.demo", display_name: "Food Finds · Demo", avatar_url: chai },
  { id: "demo-music", username: "music.demo", display_name: "Music Club · Demo", avatar_url: rooftop },
];

export const demoStories = demoAccounts.map((author, index) => ({
  authorId: author.id,
  author,
  demo: true,
  unseen: true,
  stories: [
    { id: `${author.id}-1`, title: ["A morning full of colour", "Chai time", "Rooftop sessions"][index % 3], description: "Demo story", category: null, media_url: author.avatar_url, media_kind: "image", created_at: "2026-10-14T07:00:00Z" },
    { id: `${author.id}-2`, title: "Little moments, big memories", description: "Demo story", category: null, media_url: [rooftop, market, chai][index % 3], media_kind: "image", created_at: "2026-10-14T07:00:00Z" },
  ],
}));

export const demoHighlights = [
  { id: "demo-hl-market", label: "Market", cover: market, demo: true, group: demoStories[0] },
  { id: "demo-hl-chai", label: "Chai", cover: chai, demo: true, group: demoStories[1] },
  { id: "demo-hl-rooftop", label: "Rooftop", cover: rooftop, demo: true, group: demoStories[2] },
];

export const demoPosts = [
  { id: "demo-post-market", author: demoAccounts[0], image: market, title: "Colours of Kolkata", caption: "A little morning walk through the flower market. Which colour would you pick? 🌸", likes: 128 },
  { id: "demo-post-chai", author: demoAccounts[1], image: chai, title: "A perfect chai break", caption: "Hot chai, crunchy samosas and good company. A little happiness on a plate. ☕", likes: 86 },
  { id: "demo-post-rooftop", author: demoAccounts[2], image: rooftop, title: "Music above the city", caption: "An afternoon with friends, a guitar and our favourite songs. 🎸", likes: 204 },
];
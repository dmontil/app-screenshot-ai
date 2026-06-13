import { PrototypeSwitcher } from "./PrototypeSwitcher";
import "./prototype-render.css";

const screens = [
  { src: "/prototype/literarytrip/screen-1.jpg", role: "hook", headline: "Turn books into walkable routes", caption: "Start from a story and get a real city route." },
  { src: "/prototype/literarytrip/screen-2.jpg", role: "search", headline: "Find stories by city", caption: "Search books, authors, and places worth visiting." },
  { src: "/prototype/literarytrip/screen-3.jpg", role: "places", headline: "Discover meaningful stops", caption: "Each place explains why it belongs to the route." },
  { src: "/prototype/literarytrip/screen-4.jpg", role: "map", headline: "Walk the story on a map", caption: "Follow a literary route through real streets." },
  { src: "/prototype/literarytrip/screen-1.jpg", role: "save", headline: "Save the journey", caption: "Keep routes for your next trip or reading plan." },
];

const variantState = {
  A: {
    question: "Can a continuous literary-map background make the set feel like one campaign?",
    rendererImplication: "Needs panorama seed, per-screen crop windows, shared route line, image masks.",
  },
  B: {
    question: "Can conversion-focused cards make the value clearer and more sellable?",
    rendererImplication: "Needs badges, proof/callout schema, role-specific layouts, stronger text hierarchy.",
  },
  C: {
    question: "Can a cinematic premium atlas make the product feel less like a template?",
    rendererImplication: "Needs dark theme, glow layers, oversized device crops, artifact/texture system.",
  },
};

export default async function RenderPrototypePage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const params = await searchParams;
  const variant = params.variant === "B" || params.variant === "C" ? params.variant : "A";

  return (
    <main className={`render-prototype variant-${variant.toLowerCase()}`}>
      <header className="prototype-header">
        <div>
          <p className="eyebrow">PROTOTYPE — throwaway render direction</p>
          <h1>What should the new App Screenshot AI renderer produce?</h1>
        </div>
        <div className="prototype-state">
          <b>Current state</b>
          <pre>{JSON.stringify({ variant, ...variantState[variant] }, null, 2)}</pre>
        </div>
      </header>

      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}
      {variant === "C" && <VariantC />}

      <PrototypeSwitcher current={variant} />
    </main>
  );
}

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="phone-shell">
      <img src={src} alt={alt} />
    </div>
  );
}

function VariantA() {
  return (
    <section className="prototype-set panoramic-set">
      {screens.map((screen, index) => (
        <article className="store-shot panoramic-shot" key={`${screen.role}-${index}`}>
          <div className="panorama-layer" style={{ ["--i" as string]: index }} />
          <div className="route-line" />
          <h2>{screen.headline}</h2>
          <p>{screen.caption}</p>
          <Phone src={screen.src} alt={screen.role} />
          <span className="shot-number">0{index + 1}</span>
        </article>
      ))}
    </section>
  );
}

function VariantB() {
  return (
    <section className="prototype-set cards-set">
      {screens.map((screen, index) => (
        <article className="store-shot card-shot" key={`${screen.role}-${index}`}>
          <div className="top-card">
            <span>{screen.role}</span>
            <h2>{screen.headline}</h2>
          </div>
          <Phone src={screen.src} alt={screen.role} />
          <div className="proof-card">
            <b>{index === 0 ? "For readers who travel" : index === 1 ? "Book · Author · City" : index === 2 ? "Context for every stop" : index === 3 ? "Map-first experience" : "Ready for later"}</b>
            <p>{screen.caption}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function VariantC() {
  return (
    <section className="prototype-set cinematic-set">
      {screens.map((screen, index) => (
        <article className="store-shot cinematic-shot" key={`${screen.role}-${index}`}>
          <div className="star-field" />
          <div className="atlas-ring" />
          <div className="cinematic-copy">
            <span>Chapter {index + 1}</span>
            <h2>{screen.headline}</h2>
            <p>{screen.caption}</p>
          </div>
          <Phone src={screen.src} alt={screen.role} />
        </article>
      ))}
    </section>
  );
}

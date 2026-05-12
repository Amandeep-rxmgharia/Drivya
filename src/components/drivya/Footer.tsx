import { Cloud, Twitter, Github, Linkedin } from "lucide-react";

const cols = [
  { title: "Product", links: ["Features", "Pricing", "Security", "Changelog"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
  { title: "Resources", links: ["Docs", "API", "Status", "Help center"] },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border mt-12">
      <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Cloud className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold">Drivya</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            The cloud storage built for modern teams. Fast, beautiful and private by design.
          </p>
          <div className="mt-5 flex gap-3">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="h-9 w-9 rounded-lg glass flex items-center justify-center hover:shadow-glow transition-shadow">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold">{c.title}</h4>
            <ul className="mt-4 space-y-3">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Drivya, Inc. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

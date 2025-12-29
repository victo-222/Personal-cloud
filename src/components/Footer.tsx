import { Zap } from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 0.297C5.373 0.297 0 5.67 0 12.297c0 5.292 3.438 9.787 8.205 11.387.6.111.82-.261.82-.579 0-.287-.011-1.244-.017-2.254-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.01-.323 3.31 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.3-1.553 3.31-1.23 3.31-1.23.653 1.653.241 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.803 5.624-5.475 5.922.43.371.815 1.102.815 2.222 0 1.606-.015 2.902-.015 3.293 0 .32.216.694.825.576C20.565 22.08 24 17.586 24 12.297 24 5.67 18.627.297 12 .297z" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M23.954 4.569c-.885.392-1.83.656-2.825.775 1.014-.608 1.794-1.574 2.163-2.723-.95.564-2.005.974-3.127 1.195-.897-.959-2.178-1.557-3.594-1.557-2.723 0-4.928 2.205-4.928 4.928 0 .39.045.765.127 1.124-4.094-.205-7.725-2.165-10.158-5.144-.424.722-.667 1.56-.667 2.475 0 1.709.87 3.215 2.188 4.099-.807-.026-1.566-.247-2.228-.616v.062c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.376 4.6 3.416-1.68 1.319-3.809 2.104-6.102 2.104-.397 0-.79-.023-1.17-.067 2.179 1.397 4.768 2.213 7.557 2.213 9.054 0 14.002-7.496 14.002-13.986 0-.21 0-.42-.016-.63.962-.695 1.8-1.562 2.46-2.549z" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.036-1.85-3.036-1.851 0-2.134 1.445-2.134 2.938v5.667h-3.554V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.369-1.85 3.602 0 4.267 2.37 4.267 5.451v6.29zM5.337 7.433c-1.144 0-2.07-.927-2.07-2.07 0-1.144.926-2.07 2.07-2.07 1.144 0 2.07.926 2.07 2.07 0 1.143-.926 2.07-2.07 2.07zM7.119 20.452H3.554V9h3.565v11.452z" />
  </svg>
);

const footerLinks = {
  Product: ["Features", "Pricing", "Security", "Enterprise"],
  Company: ["About", "Blog", "Careers", "Press"],
  Resources: ["Documentation", "API", "Community", "Support"],
  Legal: ["Privacy", "Terms", "Cookies", "Licenses"],
};

const socialLinks = [
  { icon: GithubIcon, href: "#" },
  { icon: TwitterIcon, href: "#" },
  { icon: LinkedinIcon, href: "#" },
];

export const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-primary/30 bg-background/50 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <Zap 
                className="w-6 h-6 text-primary"
                style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }}
              />
              <span 
                className="font-bold text-lg text-foreground"
                style={{ textShadow: "0 0 10px hsl(var(--primary))" }}
              >
                CLOUD<span className="text-primary">SPACE</span>
              </span>
            </a>
            <p className="text-sm text-muted-foreground mb-4">
              The future of cloud computing is here.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-all"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 
                className="font-semibold text-foreground mb-4"
                style={{ textShadow: "0 0 5px hsl(var(--primary) / 0.5)" }}
              >
                {title}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 CloudSpace. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Built with 💜 for the future
          </p>
        </div>
      </div>
    </footer>
  );
};

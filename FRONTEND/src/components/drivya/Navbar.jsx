import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cloud, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { easeSmooth, tweenEnter } from "@/lib/motion-presets";
import { getCurrentUser } from "../../../api/auth";

const links = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar({open,closeMobileMenu}) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate()
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  async function handleLogin() {
    try {
      const data =  await getCurrentUser()
      navigate('/dashboard/home',{state:data?.user})
    } catch (error) {}
  }
  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={tweenEnter(0.72, 0.04)}
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled
          ? "backdrop-blur-xl bg-background/75 border-b border-border shadow-sm dark:shadow-none"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-3">
        <a href="#" className="flex shrink-0 items-center gap-2 group">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Cloud className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Drivya
          </span>
        </a>

        <div className="hidden md:flex flex-1 justify-center items-center gap-8 min-w-0">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground/80"
              asChild
              
            >
              <Link onClick={handleLogin} to="/auth?tab=login">Login</Link>
            </Button>
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              asChild
            >
              <Link to="/auth?tab=register">Get Started</Link>
            </Button>
          </div>
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-foreground -mr-2"
            onClick={closeMobileMenu}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: "tween", duration: 0.42, ease: easeSmooth },
              opacity: { type: "tween", duration: 0.32, ease: easeSmooth },
            }}
            className="md:hidden overflow-hidden border-t border-border bg-background/90 backdrop-blur-xl dark:bg-background/80"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={closeMobileMenu}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link to="/auth?tab=login" onClick={closeMobileMenu}>
                    Login
                  </Link>
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary text-primary-foreground"
                  asChild
                >
                  <Link to="/auth?tab=register" onClick={closeMobileMenu}>
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

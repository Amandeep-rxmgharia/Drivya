import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Cloud,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  Car,
  Building,
  Check,
  Loader2,
  ArrowLeft,
  Activity,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { loginUser, registerUser } from "../../api/auth";

// Google Logo SVG
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

// Apple Logo SVG
const AppleIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Set tab based on URL param (?tab=register) or default to login
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get("tab") === "register" ? "register" : "login";
  });

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [registerName, setRegisterName] = useState("Aman");
  const [registerEmail, setRegisterEmail] = useState("aman@gmail.com");
  const [registerPhone, setRegisterPhone] = useState("7404771908");
  const [registerPassword, setRegisterPassword] = useState("hello");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("hello");
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Simulated validation & loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = async(e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!loginEmail || !loginPassword) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setLoadingStep("Verifying credentials...");
    const formData = {email: loginEmail,password: loginPassword}
    try {
      const data = await loginUser(formData)
      console.log(data);
      setTimeout(() => {
      setLoadingStep("Securing connection...");
      setTimeout(() => {
        setLoadingStep("Loading account data...");
        setTimeout(() => {
          setIsSuccess(true);
          setIsLoading(false);
          setTimeout(() => {
            navigate("/dashboard");
          }, 800);
        }, 600);
      }, 600);
    }, 800);
    } catch (error) {
       setIsSuccess(false);
          setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async(e) => {
    e.preventDefault();
    setErrorMsg("");

    if (
      !registerName ||
      !registerEmail ||
      !registerPhone ||
      !registerPassword ||
      !registerConfirmPassword
    ) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setErrorMsg("Please accept the terms and conditions.");
      return;
    }

    setIsLoading(true);
    setLoadingStep("Creating profile...");
    const formData = {
      name: registerName,
      email: registerEmail,
      contact: registerPhone,
      password: registerPassword
    }
       try {
      const data = await registerUser(formData);
      console.log(data);
       setTimeout(() => {
      setLoadingStep("Allocating secure node...");
      setTimeout(() => {
        setLoadingStep("Initializing dashboard...");
        setTimeout(() => {
          setIsSuccess(true);
          setIsLoading(false);
          setTimeout(() => {
            navigate("/dashboard");
          }, 800);
        }, 600);
      }, 600);
    }, 800);
    } catch (error) {
      console.log(error);
      setIsSuccess(false);
          setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen md:items-start items-center w-full flex flex-col md:flex-row text-foreground overflow-hidden font-sans select-none">
      {/* Top Left Floating Home Link & Theme Toggle (Mobile Accessible too) */}
      <div className="absolute top-4 inset-x-6 flex items-center justify-between z-40 pointer-events-none">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/30 bg-background/40 backdrop-blur-md text-sm font-medium hover:bg-background/80 hover:border-border/60 transition-all pointer-events-auto group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Home</span>
        </Link>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* LEFT COLUMN: Branding, Taglines, SVG grids, Glowing Paths, Floating metric cards */}
      <div className="relative hidden mt-17 lg:mt-0 md:flex w-1/2 flex-col justify-between p-12 lg:p-20 overflow-hidden bg-background/90 border-r border-border/10">
        {/* Animated Gradient Background Glow Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,var(--ambient-blob-a),transparent)] opacity-40 blur-3xl"
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 40, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[radial-gradient(closest-side,var(--ambient-blob-b),transparent)] opacity-30 blur-3xl"
            animate={{
              x: [0, -30, 20, 0],
              y: [0, 40, -30, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        {/* Abstract Transport/Logistics Vector Line SVG Overlay */}
        <div className="absolute inset-0 z-0 opacity-15 dark:opacity-20 pointer-events-none flex items-center justify-center">
          <svg
            className="w-full h-full max-w-lg"
            viewBox="0 0 500 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Grid */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Logistic Lines Paths */}
            <path
              d="M50 100 H250 V280 H450"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M100 200 H350 V380 H400"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <path
              d="M50 400 H200 V320 H450"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Glowing moving nodes */}
            <motion.circle
              r="4"
              fill="var(--primary)"
              className="drop-shadow-primary-glow"
              animate={{
                offsetDistance: ["0%", "100%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                offsetPath: "path('M50 100 H250 V280 H450')",
              }}
            />
            <motion.circle
              r="4"
              fill="var(--accent)"
              animate={{
                offsetDistance: ["0%", "100%"],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                offsetPath: "path('M100 200 H350 V380 H400')",
              }}
            />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-2 group cursor-default">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Cloud className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            Drivya
          </span>
        </div>

        {/* Value Tagline Center Block */}
        <div className="relative z-10 my-auto py-12 flex flex-col items-start gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Next-Gen Logistics</span>
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
              Drive smarter.
              <br />
              <span className="text-gradient">Move faster.</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-md leading-relaxed">
              Drivya is the next-generation cloud logistics platform. Dispatch,
              route, and optimize operations in real-time, built for elite
              modern fleets.
            </p>
          </div>

          {/* Floating Premium Cards Area (Desktop only layout) */}
          <div className="relative mt-8 h-48 w-full flex flex-col gap-3">
            {/* Floating Widget 1: Active Drivers */}
            <motion.div
              className="absolute left-0 top-0 glass backdrop-blur-md bg-card/45 border-white/5 shadow-elegant p-3 px-4 rounded-2xl flex items-center gap-3 cursor-pointer w-56 border border-border/20"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="h-8 w-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center relative">
                <span className="absolute h-2 w-2 rounded-full bg-green-500 animate-ping" />
                <Activity className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Active Drivers
                </div>
                <div className="text-base font-bold font-display">
                  1,482 Live
                </div>
              </div>
            </motion.div>

            {/* Floating Widget 2: Deliveries Completed */}
            <motion.div
              className="absolute right-4 top-10 glass backdrop-blur-md bg-card/45 border-white/5 shadow-elegant p-3 px-4 rounded-2xl flex items-center gap-3 cursor-pointer w-60 border border-border/20"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Deliveries Completed
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold font-display">
                    98.4%
                  </span>
                  <span className="text-[10px] text-green-500 font-semibold flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +2.4%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Floating Widget 3: Real-Time Route Progress */}
            <motion.div
              className="absolute left-10 bottom-0 glass backdrop-blur-md bg-card/45 border-white/5 shadow-elegant p-3 px-4 rounded-2xl flex flex-col gap-2 cursor-pointer w-64 border border-border/20"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] font-bold text-foreground">
                    Route DR-492
                  </span>
                </div>
                <span className="text-[9px] bg-accent/15 border border-accent/25 text-accent px-1.5 py-0.5 rounded-full font-bold">
                  In Transit
                </span>
              </div>

              <div className="w-full bg-border/20 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-accent h-full rounded-full"
                  animate={{ width: ["15%", "85%", "15%"] }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>SF Hub</span>
                <span>NY Portal</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Drivya Technologies Inc.</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Privacy & Terms
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Authentication Card with tabs, glass, glows */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 md:px-10 lg:p-20 lg:px-15 relative bg-background/50 backdrop-blur-3xl">
        {/* Soft Background glow for mobile card background, similar theme */}
        <div className="absolute inset-0 md:hidden pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[radial-gradient(closest-side,var(--ambient-blob-a),transparent)] opacity-20 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[460px] relative z-10"
        >
          {/* Mobile Only Header Logo */}
          <div className="md:hidden flex flex-col items-center justify-center gap-2 mb-8 select-none">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              Drivya
            </span>
            <p className="text-muted-foreground text-xs">
              Drive smarter. Move faster.
            </p>
          </div>

          {/* Form Status overlay when loading / success */}
          <AnimatePresence>
            {(isLoading || isSuccess) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-lg z-30 rounded-3xl flex flex-col items-center justify-center p-6 text-center"
              >
                {isLoading && (
                  <div className="space-y-4">
                    <div className="relative flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <div className="absolute w-12 h-12 rounded-full border border-primary/20 animate-ping" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground text-base">
                        Processing request
                      </p>
                      <p className="text-xs text-muted-foreground min-h-[16px]">
                        {loadingStep}
                      </p>
                    </div>
                  </div>
                )}
                {isSuccess && (
                  <motion.div
                    initial={{ scale: 0.82 }}
                    animate={{ scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                      <Check className="h-6 w-6 stroke-[3]" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-display text-xl font-bold text-foreground">
                        Welcome back to Drivya!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Redirecting to your control panel...
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glass Card Container */}
          <div className="glass mt-10 lg:mt-0 backdrop-blur-xl bg-card/45 shadow-elegant rounded-3xl border border-border/25 overflow-hidden">
            <div className="p-8 sm:p-10 space-y-6">
              {/* Header Text & Toggle Tabs */}
              <div className="space-y-4 text-center">
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {activeTab === "login"
                    ? "Welcome back"
                    : "Create your account"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "login"
                    ? "Enter your details to access your dashboard"
                    : "Join Drivya today and experience modern mobility"}
                </p>

                {/* Sliding Segmented Tab Switcher */}
                <div className="relative flex p-1 bg-muted/40 rounded-xl border border-border/20">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("login");
                      setErrorMsg("");
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg relative transition-colors focus-visible:outline-none ${
                      activeTab === "login"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {activeTab === "login" && (
                      <motion.div
                        layoutId="activeAuthTab"
                        className="absolute inset-0 bg-background shadow-sm rounded-lg border border-border/25 -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span>Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("register");
                      setErrorMsg("");
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg relative transition-colors focus-visible:outline-none ${
                      activeTab === "register"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {activeTab === "register" && (
                      <motion.div
                        layoutId="activeAuthTab"
                        className="absolute inset-0 bg-background shadow-sm rounded-lg border border-border/25 -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span>Register</span>
                  </button>
                </div>
              </div>

              {/* Error messages */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0 animate-pulse" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Forms Switcher Animation Container */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  {activeTab === "login" ? (
                    // LOGIN FORM
                    <motion.form
                      key="login"
                      onSubmit={handleLoginSubmit}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Email Field */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Email Address
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Password
                          </label>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type={showLoginPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-10 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowLoginPassword(!showLoginPassword)
                            }
                            className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showLoginPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Options: Remember Me & Forgot Password */}
                      <div className="flex items-center justify-between text-xs pt-1 select-none">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-4 h-4 rounded border-[1.5px] border-border bg-muted/60 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                              {rememberMe && (
                                <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />
                              )}
                            </div>
                          </div>
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                            Remember me
                          </span>
                        </label>

                        <a
                          href="#forgot"
                          className="text-primary hover:underline font-semibold transition-colors"
                        >
                          Forgot password?
                        </a>
                      </div>

                      {/* Submit button */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        className="w-full cursor-pointer mt-2 bg-gradient-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 shadow-glow transition-all flex items-center justify-center gap-2"
                      >
                        <span>Sign In</span>
                      </motion.button>
                    </motion.form>
                  ) : (
                    // REGISTER FORM
                    <motion.form
                      key="register"
                      onSubmit={handleRegisterSubmit}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Name Field */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Full Name
                        </label>
                        <div className="relative group">
                          <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Email Address
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                        </div>
                      </div>

                      {/* Phone Field */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Phone Number
                        </label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            value={registerPassword}
                            onChange={(e) =>
                              setRegisterPassword(e.target.value)
                            }
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-10 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowRegisterPassword(!showRegisterPassword)
                            }
                            className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showRegisterPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password Field */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Confirm Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <input
                            type="password"
                            placeholder="••••••••••••"
                            value={registerConfirmPassword}
                            onChange={(e) =>
                              setRegisterConfirmPassword(e.target.value)
                            }
                            className="w-full bg-muted/15 border border-border/30 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/45 focus:bg-muted/10 transition-all font-medium text-foreground placeholder:text-muted-foreground/60"
                          />
                        </div>
                      </div>

                      {/* Terms Acceptance */}
                      <div className="pt-1">
                        <label className="flex items-start gap-2.5 cursor-pointer group">
                          <div className="relative flex items-center justify-center mt-0.5">
                            <input
                              type="checkbox"
                              checked={acceptTerms}
                              onChange={(e) => setAcceptTerms(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-4 h-4 rounded  border-[1.5px] border-border bg-muted/80 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                              {acceptTerms && (
                                <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed font-medium">
                            I agree to the{" "}
                            <a
                              href="#terms"
                              className="text-primary hover:underline font-semibold"
                            >
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                              href="#privacy"
                              className="text-primary hover:underline font-semibold"
                            >
                              Privacy Policy
                            </a>
                            .
                          </span>
                        </label>
                      </div>

                      {/* Submit button */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        className="w-full mt-2 cursor-pointer bg-gradient-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 shadow-glow transition-all flex items-center justify-center gap-2"
                      >
                        <span>Create Account</span>
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Divider or Continue With */}
              <div className="relative flex items-center my-4">
                <div className="flex-grow border-t border-border/20"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-transparent">
                  or continue with
                </span>
                <div className="flex-grow border-t border-border/20"></div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 hover:border-border/60 text-sm font-semibold transition-all cursor-pointer"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 hover:border-border/60 text-sm font-semibold transition-all cursor-pointer"
                >
                  <AppleIcon />
                  <span>Apple</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

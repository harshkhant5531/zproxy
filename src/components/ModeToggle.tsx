import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ModeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-card border border-border shadow-sm opacity-50" disabled />;
    }

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative h-10 w-10 rounded-full bg-card border border-border shadow-sm aura-glow hover:bg-primary/10 transition-all duration-500 group overflow-hidden border-none"
        >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <Sun className="h-[1.4rem] w-[1.4rem] transition-all duration-700 
                rotate-0 scale-100 dark:-rotate-180 dark:scale-0 text-amber-500"
            />

            <Moon className="absolute h-[1.4rem] w-[1.4rem] transition-all duration-700 
                -rotate-180 scale-0 dark:rotate-0 dark:scale-100 text-blue-400"
            />

            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

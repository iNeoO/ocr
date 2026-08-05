import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") {
		return "dark";
	}

	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") {
		return stored;
	}

	return "dark";
}

function applyThemeMode(mode: ThemeMode) {
	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(mode);
	document.documentElement.setAttribute("data-theme", mode);

	document.documentElement.style.colorScheme = mode;
}

export default function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>("dark");

	useEffect(() => {
		const initialMode = getInitialMode();
		setMode(initialMode);
		applyThemeMode(initialMode);
	}, []);

	function toggleMode() {
		const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
		setMode(nextMode);
		applyThemeMode(nextMode);
		window.localStorage.setItem("theme", nextMode);
	}

	const label = `Theme mode: ${mode}. Click to switch mode.`;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--bg-panel-soft) px-3 py-2 text-(--text-strong) hover:-translate-y-0.5 hover:border-(--line-strong)"
		>
			<span className="mono-label hidden text-[0.62rem] tracking-[0.18em] sm:inline">
				{mode === "dark" ? "night deck" : "paper deck"}
			</span>
			{mode === "dark" ? (
				<Moon size={16} aria-hidden="true" />
			) : (
				<Sun size={16} aria-hidden="true" />
			)}
		</button>
	);
}

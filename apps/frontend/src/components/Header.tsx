import { Link } from "@tanstack/react-router";
import { Route as RootRoute } from "../routes/__root";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	const { session } = RootRoute.useRouteContext();

	return (
		<header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
			<nav className="page-wrap data-panel flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[24px] px-4 py-3 sm:px-5">
				<h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center gap-3 rounded-full border border-(--line-strong) bg-(--accent-soft) px-3 py-2 text-sm text-(--text-strong) no-underline sm:px-4"
					>
						<span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,var(--accent),#ffe1c5)] shadow-[0_0_18px_rgba(255,158,88,0.65)]" />
						<span className="mono-label text-[0.7rem] tracking-[0.22em]">
							OCR // deck
						</span>
					</Link>
				</h2>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold sm:order-2 sm:ml-6 sm:w-auto sm:flex-1">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Home
					</Link>
					{session ? (
						<Link
							to="/processes"
							className="nav-link"
							activeProps={{ className: "nav-link is-active" }}
						>
							Processes
						</Link>
					) : null}
					{!session ? (
						<>
							<Link
								to="/login"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Login
							</Link>
							<Link
								to="/sign-up"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Sign up
							</Link>
						</>
					) : null}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<div className="hidden rounded-full border border-(--line) px-3 py-2 sm:flex">
						<span className="nav-label text-[0.66rem] text-(--text-faint)">
							live workspace
						</span>
					</div>
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}

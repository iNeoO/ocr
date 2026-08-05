import { XMarkIcon } from "@heroicons/react/24/outline";
import { Box, Flex, IconButton, Text } from "@radix-ui/themes";
import { BellRing } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";

const MAX_TOASTS = 6;

type Toast = {
	id: string;
	title: string;
	description: string;
};

type ToastContextValue = {
	pushToast: (toast: Omit<Toast, "id">) => void;
	clearToasts: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const value = useMemo<ToastContextValue>(
		() => ({
			pushToast: ({ title, description }) => {
				const id = crypto.randomUUID();
				setToasts((current) =>
					[...current, { id, title, description }].slice(-MAX_TOASTS),
				);
			},
			clearToasts: () => {
				setToasts([]);
			},
		}),
		[],
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<Flex direction="column" gap="3" className="toast-stack">
				{toasts.length > 1 ? (
					<Flex justify="end">
						<IconButton
							size="1"
							variant="ghost"
							color="gray"
							className="rounded-full"
							onClick={value.clearToasts}
						>
							<XMarkIcon width={14} height={14} />
						</IconButton>
					</Flex>
				) : null}
				{toasts.map((toast) => (
					<Box key={toast.id} className="toast-card">
						<Flex align="start" justify="between" gap="3">
							<Flex align="start" gap="3" flexGrow="1">
								<div className="toast-icon-shell">
									<BellRing size={16} />
								</div>
								<Flex direction="column" gap="1" flexGrow="1">
									<Text size="2" weight="bold" className="text-(--text-strong)">
										{toast.title}
									</Text>
									<Text size="2" className="text-(--text-muted)">
										{toast.description}
									</Text>
								</Flex>
							</Flex>
							<IconButton
								size="1"
								variant="ghost"
								color="gray"
								className="rounded-full"
								onClick={() =>
									setToasts((current) =>
										current.filter((item) => item.id !== toast.id),
									)
								}
							>
								<XMarkIcon width={14} height={14} />
							</IconButton>
						</Flex>
					</Box>
				))}
			</Flex>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}

	return context;
}

import { Button, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Route as RootRoute } from "./__root";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const { session } = RootRoute.useRouteContext();

	return (
		<Container size="2" px="4" py={{ initial: "8", sm: "9" }}>
			<Flex direction="column" align="center" gap="5">
				<Heading size="8" className="display-title text-center">
					Welcome
				</Heading>
				<Text size="3" color="gray" align="center">
					Choose where you want to go.
				</Text>
				{!session ? (
					<Flex direction={{ initial: "column", sm: "row" }} gap="3">
						<Button asChild size="3" color="orange">
							<Link to="/login">Login</Link>
						</Button>
						<Button asChild size="3" variant="soft" color="orange">
							<Link to="/sign-up">Sign up</Link>
						</Button>
					</Flex>
				) : null}
			</Flex>
		</Container>
	);
}

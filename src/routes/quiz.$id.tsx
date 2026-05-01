import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz/$id")({
  component: () => <Outlet />,
});

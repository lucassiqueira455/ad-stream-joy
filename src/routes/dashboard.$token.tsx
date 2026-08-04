import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$token")({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/dashboard-public/$token", params: { token: params.token }, replace: true });
  },
  component: () => null,
});

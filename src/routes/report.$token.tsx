import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/report/$token")({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/report-public/$token", params: { token: params.token }, replace: true });
  },
  component: () => null,
});

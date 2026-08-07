import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/jobs(.*)",
  "/applications(.*)",
  "/approvals(.*)",
  "/inbox(.*)",
  "/tribes(.*)",
  "/career(.*)",
  "/resumes(.*)",
  "/settings(.*)",
  "/api/jobs(.*)",
  "/api/documents(.*)",
  "/api/profile(.*)",
]);

/**
 * Next.js 16 proxy (formerly middleware).
 * Public-first: marketing + sign-in/up remain open; app routes require auth.
 * n8n webhooks stay public at the proxy layer and authenticate via shared secret.
 */
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

import { db } from "@cap/database";
import { organizations } from "@cap/database/schema";
import { buildEnv, serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { NextRequest, NextResponse, userAgent } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "./lib/firebase/config";

const addHttps = (s?: string) => {
	if (!s) return s;
	return `https://${s}`;
};

const mainOrigins = [
	"https://cap.so",
	"https://cap.link",
	"http://localhost",
	serverEnv().WEB_URL,
	addHttps(serverEnv().VERCEL_URL_HOST),
	addHttps(serverEnv().VERCEL_BRANCH_URL_HOST),
	addHttps(serverEnv().VERCEL_PROJECT_PRODUCTION_URL_HOST),
].filter(Boolean) as string[];

// List of public paths that don't require authentication
const publicPaths = [
  '/login',
  '/_next',
  '/favicon.ico',
  '/api/auth',
  '/__nextjs_original-stack-frame',
  '/__nextjs_loading-build-overlay',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/site.webmanifest',
  '/google.svg',
];

// Function to verify ID token
async function verifyIdToken(auth: any, idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid or expired token');
  }
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;
  // Quiet middleware: avoid noisy logs in development and production
  
  // Handle auth callback
  if (path.startsWith('/api/auth/callback/firebase-credentials')) {
    return NextResponse.next();
  }
  
  // Short-circuit for static assets and API routes to avoid unnecessary work
  // e.g. /site.webmanifest, /*.png, /*.svg, etc.
  if (path.includes('.') || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check if current path is public
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
  
  // Skip auth checks for public paths
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Skip middleware for login page to prevent redirect loops
  if (path.startsWith('/login')) {
    return NextResponse.next();
  }

  // Get the Firebase auth token from cookies
  const authToken = request.cookies.get('__session')?.value;
  console.log('Middleware - Token:', { hasToken: !!authToken, path });
  
  // Skip auth checks for dashboard routes - let the layout handle authentication
  if (path.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // If we have an auth token, verify it
  if (authToken) {
    try {
      // Skip verification for login page to prevent redirect loops
      if (path === '/login') {
        const callbackUrl = url.searchParams.get('callbackUrl') || '/dashboard';
        return NextResponse.redirect(new URL(callbackUrl, request.url));
      }
      
      // For other protected routes, verify the token
      if (path.startsWith('/dashboard')) {
        console.log('Verifying token for protected route');
        const verifyResponse = await fetch(new URL('/api/auth/verify', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: authToken }),
        });
        
        if (!verifyResponse.ok) {
          console.log('Token verification failed');
          throw new Error('Invalid token');
        }
        
        // Token is valid, allow the request to proceed
        console.log('Token verified successfully');
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      // If token is invalid, clear the cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('__session');
      return response;
    }
  }
  
  // Handle login page with anti-clickjacking headers
  if (path.startsWith("/login")) {
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set(
      "Content-Security-Policy",
      "frame-ancestors https://cap.so"
    );
    return response;
  }
  
//   const hostname = url.hostname;

//   // Handle organization-specific routing if needed
//   if (buildEnv.NEXT_PUBLIC_IS_CAP !== "true") {
//     if (
//       !(
//         path.startsWith("/s/") ||
//         path.startsWith("/dashboard") ||
//         path.startsWith("/onboarding") ||
//         path.startsWith("/api") ||
//         path.startsWith("/login") ||
//         path.startsWith("/invite") ||
//         path.startsWith("/self-hosting") ||
//         path.startsWith("/terms")
//       ) &&
//       process.env.NODE_ENV !== "development"
//     )
//       return NextResponse.redirect(new URL("/login", url.origin));
//     else return NextResponse.next();
//   }

//   if (mainOrigins.some((d) => url.origin.startsWith(d))) {
//     // We just let the request go through for main domains, page-level logic will handle redirects
//     return NextResponse.next();
//   }

//   const webUrl = new URL(serverEnv().WEB_URL).hostname;

//   try {
//     // We're on a custom domain at this point
//     // Only allow /s/ routes for custom domains
//     if (!path.startsWith("/s/")) {
//       const url = new URL(request.url); 
//       url.hostname = webUrl;
//       return NextResponse.redirect(url);
//     }

//     // Check if we have a cached verification
//     const verifiedDomain = request.cookies.get("verified_domain");
//     if (verifiedDomain?.value === hostname) return NextResponse.next();

//     // Query the space with this custom domain
//     const [organization] = await db()
//       .select()
//       .from(organizations)
//       .where(eq(organizations.customDomain, hostname));

//     if (!organization || !organization.domainVerified) {
//       // If no verified custom domain found, redirect to main domain
//       const url = new URL(request.url);
//       url.hostname = webUrl;
//       return NextResponse.redirect(url);
//     }

//     // Set verification cookie for non-API routes too
//     const response = NextResponse.next();
//     response.cookies.set("verified_domain", hostname, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 3600, // Cache for 1 hour
//     });

//     // Get the pathname and referrer
//     const { pathname } = request.nextUrl;
//     const referrer = request.headers.get("referer") || "";

//     // Parse user agent with the userAgent utility
//     const ua = userAgent(request);

//     // Add custom headers to check in generateMetadata
//     response.headers.set("x-pathname", pathname);
//     response.headers.set("x-referrer", referrer);
//     response.headers.set("x-user-agent", JSON.stringify(ua));

//     return response;
//   } catch (error) {
//     console.error("Error in middleware:", error);
//     return notFound();
//   }
  // Default: allow request to proceed
  return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, robots.txt, sitemap.xml (static files)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
	],
};

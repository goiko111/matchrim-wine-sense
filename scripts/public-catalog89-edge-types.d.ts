// Test-only declaration for semantic checking without installing Deno or
// downloading the existing standard-library server dependency.
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

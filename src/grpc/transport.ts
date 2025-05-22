import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { Interceptor } from "@connectrpc/connect";
import { createAuthInterceptor } from "./interceptors";

export const createTransport = (baseUrl: string, token?: string) => {
  const interceptors: Interceptor[] = [];
  
  if (token) {
    interceptors.push(createAuthInterceptor(token));
  }

  return createGrpcWebTransport({
    baseUrl: baseUrl,
    interceptors: interceptors
  });
}; 
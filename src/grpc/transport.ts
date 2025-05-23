import { createGrpcTransport } from "@connectrpc/connect-node";
import { Interceptor } from "@connectrpc/connect";
import { createAuthInterceptor } from "./interceptors";

export const createTransport = (baseUrl: string, token?: string) => {
  const interceptors: Interceptor[] = [];

  if (token) {
    interceptors.push(createAuthInterceptor(token));
  }

  return createGrpcTransport({
    baseUrl: baseUrl,
    interceptors: interceptors,
    useBinaryFormat: true,
  });
}; 
import { Interceptor } from "@connectrpc/connect";

export const createAuthInterceptor = (token: string): Interceptor => {
      return (next) => async (req) => {
            req.header.set("Authorization", `Bearer ${token}`);
            return next(req);
      };
}; 
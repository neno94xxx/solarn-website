import { defineMiddleware } from 'astro:middleware';
import { adminSession } from './lib/server/supabase';
export const onRequest = defineMiddleware(async (context,next) => {
  const path=context.url.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api/admin/')) {
    if (path.startsWith('/admin') && path !== '/admin/prijava/') {
      try {
        const session=await adminSession(context);
        if(!session.admin) return new Response(null,{status:303,headers:{Location:'/admin/prijava/','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
        context.locals.adminEmail=session.user!.email || '';
      } catch { return context.redirect('/admin/prijava/?error=unavailable',303); }
    }
    const response=await next();
    response.headers.set('Cache-Control','private, no-store');
    response.headers.set('X-Robots-Tag','noindex, nofollow');
    response.headers.set('X-Frame-Options','DENY');
    response.headers.set('Referrer-Policy','same-origin');
    return response;
  }
  return next();
});

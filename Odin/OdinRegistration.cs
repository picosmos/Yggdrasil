using Microsoft.AspNetCore.Builder;

namespace Odin
{
    public static class OdinRegistration
    {
        public static void RegisterOdinAuth(this WebApplication app)
        {
            app.UseWhen(context => context.Request.Path.StartsWithSegments("/odin"), appBuilder =>
            {
                appBuilder.UseMiddleware<Odin.Middleware.BasicAuthMiddleware>();
            });
        }

        public static void RegisterOdinRoutes(this WebApplication app)
        {
            app.MapControllerRoute(
                name: "areas",
                pattern: "odin/{controller=Home}/{action=Index}/{id?}");
        }
    }
}
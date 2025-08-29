using Odin.Services;

namespace Odin;

public static class OdinRegistration
{
    public static void RegisterOdinServices(this IServiceCollection services)
    {
        services.AddScoped<GenericDataService>();
    }

    public static void RegisterOdinAuth(this WebApplication app)
    {
        app.UseWhen(context => context.Request.Path.StartsWithSegments("/odin"), appBuilder =>
        {
            appBuilder.UseMiddleware<Odin.Middleware.LoggingMiddleware>();
            appBuilder.UseMiddleware<Odin.Middleware.BasicAuthMiddleware>();
        });
    }

    public static void RegisterOdinRoutes(this WebApplication app)
    {
        app.MapControllerRoute(
            name: "Odin",
            pattern: "Odin/{controller=Home}/{action=Index}/{table?}/{id?}");
    }
}
using System.Text;

namespace Odin.Middleware;

public class BasicAuthMiddleware(RequestDelegate next, ILogger<BasicAuthMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<BasicAuthMiddleware> _logger = logger;
    private static readonly string USERNAME = Environment.GetEnvironmentVariable("BASIC_AUTH_USERNAME") ?? "admin";
    private static readonly string PASSWORD = Environment.GetEnvironmentVariable("BASIC_AUTH_PASSWORD") ?? "password";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.ContainsKey("Authorization"))
        {
            this._logger.LogWarning("Authorization header missing. Denying request from {RemoteIp}", context.Connection.RemoteIpAddress);
            context.Response.Headers.WWWAuthenticate = "Basic realm=\"Protected Area\"";
            context.Response.StatusCode = 401;
            await context.Response.CompleteAsync();
            return;
        }

        var authHeader = context.Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            this._logger.LogWarning("Authorization header does not start with 'Basic '. Denying request from {RemoteIp}", context.Connection.RemoteIpAddress);
            context.Response.Headers.WWWAuthenticate = "Basic realm=\"Protected Area\"";
            context.Response.StatusCode = 401;
            await context.Response.CompleteAsync();
            return;
        }

        var encodedCredentials = authHeader["Basic ".Length..].Trim();

        var jumpToNext = false;
        try
        {
            var credentialBytes = Convert.FromBase64String(encodedCredentials);
            var credentials = Encoding.UTF8.GetString(credentialBytes).Split(':', 2);
            if (credentials.Length == 2 && credentials[0] == USERNAME && credentials[1] == PASSWORD)
            {
                this._logger.LogInformation("Basic authentication succeeded for user '{Username}' from {RemoteIp}", credentials[0], context.Connection.RemoteIpAddress);
                jumpToNext = true;
            }
            else
            {
                this._logger.LogWarning("Basic authentication failed for user '{Username}' from {RemoteIp}", credentials.Length > 0 ? credentials[0] : "<unknown>", context.Connection.RemoteIpAddress);
            }
        }
        catch (Exception ex)
        {
            this._logger.LogError(ex, "Exception occurred while decoding Basic Auth credentials from {RemoteIp}", context.Connection.RemoteIpAddress);
        }

        if (jumpToNext)
        {
            await this._next(context);
            return;
        }

        context.Response.Headers.WWWAuthenticate = "Basic realm=\"Protected Area\"";
        context.Response.StatusCode = 401;
        await context.Response.CompleteAsync();
    }
}

using Microsoft.AspNetCore.Http;
using System;
using System.Text;
using System.Threading.Tasks;

namespace Odin.Middleware
{
    public class BasicAuthMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly string USERNAME = Environment.GetEnvironmentVariable("BASIC_AUTH_USERNAME") ?? "admin";
        private static readonly string PASSWORD = Environment.GetEnvironmentVariable("BASIC_AUTH_PASSWORD") ?? "password";

        public BasicAuthMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (!context.Request.Headers.ContainsKey("Authorization"))
            {
                context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Protected Area\"";
                context.Response.StatusCode = 401;
                await context.Response.CompleteAsync();
                return;
            }

            var authHeader = context.Request.Headers["Authorization"].ToString();
            if (!authHeader.StartsWith("Basic "))
            {
                context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Protected Area\"";
                context.Response.StatusCode = 401;
                await context.Response.CompleteAsync();
                return;
            }

            var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();

            try
            {
                var credentialBytes = Convert.FromBase64String(encodedCredentials);
                var credentials = Encoding.UTF8.GetString(credentialBytes).Split(':', 2);
                if (credentials.Length == 2 && credentials[0] == USERNAME && credentials[1] == PASSWORD)
                {
                    await _next(context);
                    return;
                }
            }
            catch { }

            context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Protected Area\"";
            context.Response.StatusCode = 401;
            await context.Response.CompleteAsync();
        }
    }
}
